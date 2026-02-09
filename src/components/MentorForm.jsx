
import React, { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCategories, fetchSkills, uploadProfileImage, submitMentorApplication } from '../lib/api';
import { cn } from '../lib/utils';

export default function MentorForm() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Data Lists
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        countryCode: '+91',
        phone: '',
        location: '',
        bio: '',
        linkedin: '',
        github: '',
        portfolio: '',
        videoIntro: '',

        title: '',
        company: '',
        yearsOfExperience: '',
        hourlyRate: '',
        expertiseLevel: 'intermediate',

        selectedCategories: [],
        selectedSkills: [],

        experiences: [
            { company: '', role: '', description: '', startDate: '', endDate: '', isCurrent: false }
        ]
    });

    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        // Load initial data
        const loadData = async () => {
            const cats = await fetchCategories();
            const skls = await fetchSkills();
            setAvailableCategories(cats || []);
            setAvailableSkills(skls || []);
        };
        loadData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryToggle = (catId) => {
        setFormData(prev => {
            const current = prev.selectedCategories;
            if (current.includes(catId)) {
                return { ...prev, selectedCategories: current.filter(id => id !== catId) };
            }
            return { ...prev, selectedCategories: [...current, catId] };
        });
    };

    const handleSkillToggle = (skillId) => {
        setFormData(prev => {
            const current = prev.selectedSkills;
            if (current.includes(skillId)) {
                return { ...prev, selectedSkills: current.filter(id => id !== skillId) };
            }
            return { ...prev, selectedSkills: [...current, skillId] };
        });
    };

    const handleExperienceChange = (index, field, value) => {
        const newExperiences = [...formData.experiences];
        newExperiences[index] = { ...newExperiences[index], [field]: value };
        setFormData(prev => ({ ...prev, experiences: newExperiences }));
    };

    const addExperience = () => {
        setFormData(prev => ({
            ...prev,
            experiences: [...prev.experiences, { company: '', role: '', description: '', startDate: '', endDate: '', isCurrent: false }]
        }));
    };

    const removeExperience = (index) => {
        if (formData.experiences.length === 1) return;
        setFormData(prev => ({
            ...prev,
            experiences: prev.experiences.filter((_, i) => i !== index)
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation basics
            if (!formData.fullName || !formData.email || !formData.title) {
                throw new Error("Please fill in required fields.");
            }
            if (!profileImage) {
                throw new Error("Please upload a profile photo.");
            }

            // Upload Image
            let imageUrl = '';
            try {
                imageUrl = await uploadProfileImage(profileImage);
            } catch (err) {
                console.error("Image upload failed", err);
                throw new Error("Failed to upload image.");
            }

            // Prepare payload
            const payload = {
                personal: {
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: `${formData.countryCode} ${formData.phone}`,
                    location: formData.location,
                    bio: formData.bio,
                    linkedin: formData.linkedin,
                    github: formData.github,
                    portfolio: formData.portfolio,
                    videoIntro: formData.videoIntro,
                    profileImageUrl: imageUrl // Where does this go? mentors table or user_profiles?
                    // Prompt didn't specify column for image URL in tables list.
                    // But mentions "Profile Photo Upload (store in Supabase Storage → return URL)".
                    // Assuming inserting into user_profiles 'avatar_url' or similar if it exists, 
                    // or just skipping if schema doesn't have it.
                    // Wait, the prompt lists columns for user_profiles and mentors but NO image_url column.
                    // "Insert: full_name, email, phone, role, bio, location, timezone" -> NO IMAGE COLUMN.
                    // I will assume it might be 'bio' or maybe I missed it? 
                    // "Profile Photo Upload (store in Supabase Storage → return URL)" is in UI requirements.
                    // I will append it to bio or just ignore saving it to DB if column missing, 
                    // but usually it's in user_profiles. 
                    // I'll check user_profiles schema if I could, but I can't.
                    // I'll assume 'avatar_url' exists as standard supabase, or just not save it to DB effectively.
                    // Actually, I'll add it to 'metadata' of user if possible, or just ignore for now to avoid SQL error.
                },
                professional: {
                    title: formData.title,
                    company: formData.company,
                    yearsOfExperience: formData.yearsOfExperience,
                    hourlyRate: formData.hourlyRate,
                    expertiseLevel: formData.expertiseLevel,
                },
                categories: formData.selectedCategories,
                skills: formData.selectedSkills,
                experiences: formData.experiences
            };

            await submitMentorApplication(payload);
            setSuccess(true);
            toast.success("Application Submitted Successfully!");

        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-green-100 text-center py-20">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Application Submitted!</h2>
                <p className="text-lg text-slate-600 max-w-lg mx-auto">
                    Thank you for applying as a mentor at UnchaAI. Our team will review your profile and contact you within 48 hours.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 text-brand-600 font-medium hover:underline"
                >
                    Submit another application
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6 md:p-10">

            {/* Personal Details */}
            <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Personal Details</h3>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="md:col-span-2 flex justify-center mb-4">
                        <div className="relative group cursor-pointer">
                            <div className={cn(
                                "w-32 h-32 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50",
                                imagePreview ? "border-solid border-brand-200" : ""
                            )}>
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Upload className="w-8 h-8 mx-auto mb-2" />
                                        <span className="text-xs">Upload Photo</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                        <input
                            required
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="e.g. Rahul Sharma"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                        <input
                            required
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="rahul@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                        <div className="flex">
                            <div className="relative">
                                <select
                                    name="countryCode"
                                    value={formData.countryCode}
                                    onChange={handleChange}
                                    className="appearance-none h-full px-3 py-2 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none cursor-pointer pr-8"
                                    style={{ minWidth: '90px' }}
                                >
                                    <option value="+91">🇮🇳 +91</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                    <option value="+61">🇦🇺 +61</option>
                                    <option value="+971">🇦🇪 +971</option>
                                    <option value="+65">🇸🇬 +65</option>
                                    <option value="+49">🇩🇪 +49</option>
                                    <option value="+33">🇫🇷 +33</option>
                                    <option value="+81">🇯🇵 +81</option>
                                    <option value="+86">🇨🇳 +86</option>
                                    <option value="+82">🇰🇷 +82</option>
                                    <option value="+7">🇷🇺 +7</option>
                                    <option value="+55">🇧🇷 +55</option>
                                    <option value="+27">🇿🇦 +27</option>
                                    <option value="+234">🇳🇬 +234</option>
                                    <option value="+62">🇮🇩 +62</option>
                                    <option value="+60">🇲🇾 +60</option>
                                    <option value="+63">🇵🇭 +63</option>
                                    <option value="+66">🇹🇭 +66</option>
                                    <option value="+84">🇻🇳 +84</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <input
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                className="flex-1 px-4 py-2 rounded-r-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                                placeholder="98765 43210"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Scroll to change country code</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="Mumbai, India"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Short Bio</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="Tell us a bit about yourself..."
                        />
                    </div>
                </div>
            </div>

            {/* Professional Details */}
            <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Professional Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Professional Title *</label>
                        <input
                            required
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="e.g. Senior Physics Mentor"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Company / College</label>
                        <input
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="e.g. IIT Bombay / Unacademy"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                        <input
                            type="number"
                            name="yearsOfExperience"
                            value={formData.yearsOfExperience}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="e.g. 5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate (INR)</label>
                        <input
                            type="number"
                            name="hourlyRate"
                            value={formData.hourlyRate}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            placeholder="e.g. 500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expertise Level</label>
                        <select
                            name="expertiseLevel"
                            value={formData.expertiseLevel}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Categories & Skills */}
            <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Expertise</h3>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Categories</label>
                    <div className="flex flex-wrap gap-3">
                        {availableCategories.length > 0 ? availableCategories.map(cat => (
                            <button
                                type="button"
                                key={cat.id}
                                onClick={() => handleCategoryToggle(cat.id)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                                    formData.selectedCategories.includes(cat.id)
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                )}
                            >
                                {cat.name}
                            </button>
                        )) : (
                            <p className="text-sm text-slate-400 italic">No categories loaded. (Check DB)</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Skills</label>
                    <div className="flex flex-wrap gap-2">
                        {availableSkills.length > 0 ? availableSkills.map(skill => (
                            <button
                                type="button"
                                key={skill.id}
                                onClick={() => handleSkillToggle(skill.id)}
                                className={cn(
                                    "px-3 py-1 rounded-md text-sm transition-colors border",
                                    formData.selectedSkills.includes(skill.id)
                                        ? "bg-blue-100 text-blue-700 border-blue-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                )}
                            >
                                {skill.name}
                            </button>
                        )) : (
                            <p className="text-sm text-slate-400 italic">No skills loaded. (Check DB)</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Experience */}
            <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Experience</h3>

                <div className="space-y-6">
                    {formData.experiences.map((exp, index) => (
                        <div key={index} className="bg-slate-50 p-6 rounded-xl relative border border-slate-200">
                            {formData.experiences.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeExperience(index)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company / Organization</label>
                                    <input
                                        value={exp.company}
                                        onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role / Position</label>
                                    <input
                                        value={exp.role}
                                        onChange={(e) => handleExperienceChange(index, 'role', e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={exp.startDate}
                                        onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
                                    <input
                                        type="date"
                                        disabled={exp.isCurrent}
                                        value={exp.endDate}
                                        onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exp.isCurrent}
                                        onChange={(e) => handleExperienceChange(index, 'isCurrent', e.target.checked)}
                                        className="rounded text-brand-600 focus:ring-brand-500"
                                    />
                                    Currently Working Here
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
                                <textarea
                                    value={exp.description}
                                    onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                                    rows="2"
                                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addExperience}
                        className="flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700 text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Another Experience
                    </button>
                </div>
            </div>

            {/* Social Links */}
            <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Social Presence</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
                        <input
                            name="linkedin"
                            value={formData.linkedin}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="https://linkedin.com/in/..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">GitHub URL (Optional)</label>
                        <input
                            name="github"
                            value={formData.github}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="https://github.com/..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio URL (Optional)</label>
                        <input
                            name="portfolio"
                            value={formData.portfolio}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="https://..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Intro Video URL (Optional)</label>
                        <input
                            name="videoIntro"
                            value={formData.videoIntro}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="Youtube / Loom link"
                        />
                    </div>
                </div>
            </div>

            <div className="text-center pt-6">
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-brand-500 text-white font-bold py-4 px-12 rounded-full shadow-lg hover:bg-brand-600 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2 mx-auto"
                >
                    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                    {loading ? 'Submitting...' : 'Apply as Mentor'}
                </button>
            </div>

        </form>
    );
}
