
import { supabase } from './supabaseClient';

export async function fetchCategories() {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
    return data;
}

export async function fetchSkills() {
    const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching skills:', error);
        return [];
    }
    return data;
}

export async function uploadProfileImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('mentor-assets') // Assuming 'mentor-assets' or similar bucket exists. Prompt didn't specify, using generic.
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('mentor-assets')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

export async function submitMentorApplication({ personal, professional, categories, skills, experiences }) {
    // 1. Sign up / Create User (Using generic email signup for now)
    // Note: user_profiles usually linked to auth.users. 
    // If we are just registering a mentor who might already be a user, logic differs.
    // Assuming new user flow based on 'Supabase Auth (email signup)' prompt requirement.

    // A. AUTH SIGNUP
    let userId = null;

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: personal.email,
        password: 'temp-password-123', // Temporary password
        options: {
            data: {
                full_name: personal.fullName,
                role: 'mentor',
                avatar_url: personal.profileImageUrl,
                phone: personal.phone,
                bio: personal.bio,
                location: personal.location,
                timezone: 'Asia/Kolkata'
            }
        }
    });

    if (authError) {
        console.error("Auth signup failed:", authError.message);

        // Handle common errors gracefully
        if (authError.message.includes("rate limit")) {
            throw new Error("Too many attempts. Please use a DIFFERENT email address or wait.");
        }
        if (authError.message.includes("already registered") || authError.message.includes("unique constraint")) {
            throw new Error("This email is already registered. Please login instead.");
        }

        throw new Error(`Registration Failed: ${authError.message}`);
    }

    userId = authData.user?.id;

    if (!userId) {
        throw new Error("Failed to generate User ID during registration.");
    }

    try {
        // 2. Insert into user_profiles 
        // We try this as a backup, but we suppress errors because RLS might block it
        // (if email not confirmed) and the Trigger should have handled it anyway.
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
                id: userId,
                full_name: personal.fullName,
                email: personal.email,
                phone: personal.phone,
                role: 'mentor',
                bio: personal.bio,
                location: personal.location,
                timezone: 'Asia/Kolkata'
            });

        if (profileError) {
            console.warn("Client-side profile creation skipped (likely due to RLS). Relying on DB Trigger.", profileError);
            // DO NOT THROW here, as the Trigger handles it.
        }
    } catch (err) {
        console.warn("Profile exception (non-fatal):", err);
    }

    try {
        // 3. Insert into mentors
        // We sanitize the insert object to ONLY include columns we know exist in 'mentors' 
        // to avoid "Column not found" errors if running in anonymous fallback mode.
        const mentorInsertPayload = {
            user_id: userId, // Can be null (Anonymous supported)
            full_name: personal.fullName,
            email: personal.email,
            phone: personal.phone,
            bio: personal.bio,
            location: personal.location,
            profile_image_url: personal.profileImageUrl,

            title: professional.title,
            company: professional.company,
            years_of_experience: parseInt(professional.yearsOfExperience) || 0,
            hourly_rate: parseInt(professional.hourlyRate) || 0,
            expertise_level: professional.expertiseLevel,
            linkedin_url: personal.linkedin,
            github_url: personal.github,
            portfolio_url: personal.portfolio,
            video_intro_url: personal.videoIntro,
            status: 'pending_approval'
        };

        const { data: mentorData, error: mentorError } = await supabase
            .from('mentors')
            .insert(mentorInsertPayload)
            .select()
            .single();

        if (mentorError) throw new Error(`Mentor Error: ${mentorError.message}`);
        const mentorId = mentorData.id;

        // Fallback info injection removed (using direct DB columns now)



        // 4. Insert Categories
        // Assuming mentor_categories links mentor_id and category_id
        if (categories.length > 0) {
            const categoryInserts = categories.map(catId => ({
                mentor_id: mentorId,
                category_id: catId
            }));

            const { error: catError } = await supabase
                .from('mentor_categories')
                .insert(categoryInserts);

            if (catError) throw new Error(`Category Error: ${catError.message}`);
        }

        // 5. Insert Skills
        if (skills.length > 0) {
            // Prompt says "Insert rows into mentor_skills". Assuming table has mentor_id and skill_id.
            // If skills are just text tags not in DB, we might need to insert them into 'skills' first?
            // "Fetch skills from skills table... Insert rows into mentor_skills" implies linking.
            // But prompt also says "Multi select / tag input". 
            // We will assume `skills` arg is array of skill_ids or names.
            // If names, we need to resolve IDs. For simplicity & speed, assuming UI selects existing IDs.

            const skillInserts = skills.map(skillId => ({
                mentor_id: mentorId,
                skill_id: skillId
            }));

            const { error: skillError } = await supabase
                .from('mentor_skills')
                .insert(skillInserts);

            if (skillError) throw new Error(`Skill Error: ${skillError.message}`);
        }

        // 6. Insert Experiences
        if (experiences.length > 0) {
            const experienceInserts = experiences.map(exp => ({
                mentor_id: mentorId,
                company: exp.company,
                position: exp.role,
                description: exp.description,
                start_date: exp.startDate || null,
                end_date: (exp.isCurrent || !exp.endDate) ? null : exp.endDate,
                is_current: exp.isCurrent
            }));

            const { error: expError } = await supabase
                .from('experiences')
                .insert(experienceInserts);

            if (expError) throw new Error(`Experience Error: ${expError.message}`);
        }

        return { success: true };

    } catch (error) {
        console.error("Submission error:", error);
        // Cleanup? If this was a transaction, Supabase handle it. 
        // Manual cleanup is complex here without stored procedures.
        throw error;
    }
}

export async function checkMentorExistence(userId) {
    const { data, error } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Error checking mentor:", error);
        throw error;
    }

    return !!data;
}

export async function getMentorId(userId) {
    const { data, error } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Mentor not found");
    return data.id;
}

export async function fetchAvailability(mentorId) {
    const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('day_of_week')
        .order('start_time');

    if (error) {
        console.error("Error fetching availability:", error);
        return [];
    }
    return data;
}

export async function addAvailabilitySlot(slot) {
    const { data, error } = await supabase
        .from('availability_slots')
        .insert(slot)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteAvailabilitySlot(slotId) {
    const { error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', slotId);

    if (error) throw error;
    return true;
}

export async function claimMentorProfile(phone, userId) {
    // USE SECURE RPC to link profile (Bypasses RLS)
    const { data: success, error } = await supabase.rpc('link_mentor_by_phone', {
        p_phone: phone,
        p_user_id: userId
    });

    if (error) {
        console.error("RPC Link error:", error);
        return false;
    }

    return success;
}

export async function getMentorProfile(userId) {
    const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function updateMentorProfile(mentorId, updates) {
    const { data, error } = await supabase
        .from('mentors')
        .update(updates)
        .eq('id', mentorId)
        .select()
        .single();

    if (error) throw error;

    // Also try to update user_profiles cache if name/bio changed
    if (updates.full_name || updates.bio || updates.location || updates.phone) {
        // We can try updates, but ignore errors if RLS blocks
        const { data: mentor } = await supabase.from('mentors').select('user_id').eq('id', mentorId).single();
        if (mentor && mentor.user_id) {
            await supabase.from('user_profiles').update({
                full_name: updates.full_name,
                bio: updates.bio,
                location: updates.location,
                phone: updates.phone
            }).eq('id', mentor.user_id).catch(err => console.warn('Profile sync skipped', err));
        }
    }

    return data;
}

export async function createMentorProfile(userId, phone, email = null) {
    // 1. Create a basic mentor profile
    const { data, error } = await supabase
        .from('mentors')
        .insert({
            user_id: userId,
            phone: phone,
            email: email, // Might be null for phone-only auth
            full_name: 'Mentor',
            title: 'New Mentor',
            hourly_rate: 0,
            status: 'pending_approval'
        })
        .select()
        .single();

    if (error) throw error;

    // 2. Also ensure user_profile exists
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            email: email || `${phone}@placeholder.com`, // Fallback for phone-auth
            phone: phone,
            full_name: 'Mentor',
            role: 'mentor'
        });

    if (profileError) console.warn("Auto-create user_profile warning:", profileError);

    return data;
}

export async function fetchUpcomingSessions(mentorId) {
    const { data, error } = await supabase
        .from('sessions')
        .select('id, title, scheduled_at, duration_minutes, status, meeting_url, start_url, notes')
        .eq('mentor_id', mentorId)
        .eq('status', 'upcoming')
        .order('scheduled_at', { ascending: true })
        .limit(10);

    if (error) {
        console.error('Error fetching upcoming sessions:', error);
        return [];
    }

    // Format sessions for UI
    return data.map(session => ({
        id: session.id,
        title: session.title || 'Session',
        scheduledAt: session.scheduled_at,
        timeDisplay: formatSessionTime(session.scheduled_at),
        durationMinutes: session.duration_minutes,
        meetingLink: session.meeting_url,
        startUrl: session.start_url,
        notes: session.notes,
        status: session.status
    }));
}

function formatSessionTime(isoString) {
    if (!isoString) return 'TBD';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;

    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${timeStr}`;
}

export async function fetchSessionStats(mentorId) {
    const nowISO = new Date().toISOString();

    // 1. Completed Sessions: status = 'completed'
    const completedQuery = supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .eq('status', 'completed');

    // 2. Pending Sessions: status = 'pending'
    const pendingQuery = supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .eq('status', 'pending');

    // 3. Upcoming Sessions: status = 'upcoming'
    const upcomingQuery = supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .eq('status', 'upcoming');

    // execute in parallel
    const [completedRes, pendingRes, upcomingRes] = await Promise.all([
        completedQuery,
        pendingQuery,
        upcomingQuery
    ]);

    // Log errors if any (but return 0s to keep UI stable)
    if (completedRes.error) console.error("Error fetching completed stats:", completedRes.error);
    if (pendingRes.error) console.error("Error fetching pending stats:", pendingRes.error);
    if (upcomingRes.error) console.error("Error fetching upcoming stats:", upcomingRes.error);

    return {
        completed: completedRes.count || 0,
        pending: pendingRes.count || 0,
        upcoming: upcomingRes.count || 0
    };
}
