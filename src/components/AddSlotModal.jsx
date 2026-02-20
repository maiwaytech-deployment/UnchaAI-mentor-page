import React, { useState } from 'react';
import { X, Loader2, Info } from 'lucide-react';
import { addAvailabilitySlot } from '../lib/api';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AddSlotModal({ isOpen, onClose, onSuccess, mentorId }) {
    const [loading, setLoading] = useState(false);

    // Form State
    const [day, setDay] = useState(1); // Monday
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [isRecurring, setIsRecurring] = useState(true);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Check for overnight slot (EndTime <= StartTime)
            if (endTime <= startTime) {
                // Split into two slots
                const day1 = parseInt(day);
                const day2 = (day1 + 1) % 7;

                // Slot 1: StartTime -> 23:59
                await addAvailabilitySlot({
                    mentor_id: mentorId,
                    day_of_week: day1,
                    start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
                    end_time: '23:59:59',
                    is_recurring: isRecurring,
                    is_available: true
                });

                // Slot 2: 00:00 -> EndTime (Next Day)
                await addAvailabilitySlot({
                    mentor_id: mentorId,
                    day_of_week: day2,
                    start_time: '00:00:00',
                    end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
                    is_recurring: isRecurring,
                    is_available: true
                });

                toast.success("Overnight slot added as two separate entries");
            } else {
                // Normal Slot
                await addAvailabilitySlot({
                    mentor_id: mentorId,
                    day_of_week: parseInt(day),
                    start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
                    end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
                    is_recurring: isRecurring,
                    is_available: true
                });
                toast.success("Slot added successfully");
            }

            onSuccess(); // Refresh parent
            onClose();   // Close modal
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to add slot");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Add Availability</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Day Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Day of Week</label>
                        <select
                            value={day}
                            onChange={(e) => setDay(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                            {DAYS.map((d, i) => (
                                <option key={i} value={i}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Recurring Checkbox */}
                    <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                        <input
                            type="checkbox"
                            id="recurring"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="mt-1 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                        />
                        <label htmlFor="recurring" className="text-sm text-blue-900 cursor-pointer">
                            <span className="font-semibold block">Repeat Weekly</span>
                            <span className="text-blue-700 text-xs">This slot will appear automatically every week.</span>
                        </label>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-lg hover:shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Slot
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
