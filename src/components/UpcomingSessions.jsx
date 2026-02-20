import React from 'react';
import { Calendar, Video, Copy, ExternalLink, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpcomingSessions({ sessions = [] }) {

    const handleCopyLink = (link) => {
        navigator.clipboard.writeText(link);
        toast.success('Meeting link copied!');
    };

    const handleJoinSession = (session) => {
        const link = session.startUrl || session.meetingLink;
        if (link) {
            window.open(link, '_blank');
        } else {
            toast.error('No meeting link available');
        }
    };

    return (
        <div className="bg-white border-r border-slate-200 h-full flex flex-col w-80 shrink-0">
            <div className="p-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Upcoming Sessions</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {sessions.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No upcoming bookings</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map(session => (
                            <div key={session.id} className="p-3 bg-brand-50 rounded-lg border border-brand-100">
                                {/* Title & Status */}
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-brand-900 text-sm">{session.title}</span>
                                    <span className="text-xs bg-brand-200 text-brand-800 px-1.5 py-0.5 rounded capitalize">{session.status}</span>
                                </div>

                                {/* Time */}
                                <div className="flex items-center gap-2 text-xs text-brand-700 mb-2">
                                    <Calendar className="w-3 h-3" /> {session.timeDisplay}
                                </div>

                                {/* Duration */}
                                {session.durationMinutes && (
                                    <div className="flex items-center gap-2 text-xs text-brand-600 mb-3">
                                        <Clock className="w-3 h-3" /> {session.durationMinutes} minutes
                                    </div>
                                )}

                                {/* Link Display (Start URL priority) */}
                                {(session.startUrl || session.meetingLink) && (
                                    <div className="mb-3">
                                        <div className="text-xs text-slate-500 mb-1">
                                            {session.startUrl ? 'Start Link (Host):' : 'Meeting Link:'}
                                        </div>
                                        <div className="flex items-center gap-1 bg-white rounded border border-brand-200 p-2">
                                            <a
                                                href={session.startUrl || session.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-brand-600 hover:underline truncate flex-1"
                                            >
                                                {session.startUrl || session.meetingLink}
                                            </a>
                                            <button
                                                onClick={() => handleCopyLink(session.startUrl || session.meetingLink)}
                                                className="p-1 hover:bg-brand-100 rounded transition-colors"
                                                title="Copy link"
                                            >
                                                <Copy className="w-3 h-3 text-brand-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Join Button */}
                                <button
                                    onClick={() => handleJoinSession(session)}
                                    disabled={!session.meetingLink && !session.startUrl}
                                    className={`w-full py-1.5 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${(session.meetingLink || session.startUrl)
                                        ? 'bg-brand-600 hover:bg-brand-700'
                                        : 'bg-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Video className="w-3 h-3" />
                                    {(session.meetingLink || session.startUrl) ? 'Join Session' : 'No Link Yet'}
                                    {(session.meetingLink || session.startUrl) && <ExternalLink className="w-3 h-3" />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
