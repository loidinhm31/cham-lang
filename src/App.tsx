import React, { useState } from 'react';
import {
    Search, Menu, Play, Check, X, Bell, Settings,
    User, Heart, Star, ChevronRight, Lock, Globe,
    BookOpen, Award, TrendingUp, MessageCircle
} from 'lucide-react';

// Floating Background Component
const FloatingBg = () => (
    <>
        <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(5deg); }
      }
    `}</style>
        <div className="absolute w-32 h-32 bg-cyan-400 opacity-20 rounded-lg top-10 left-10 rotate-12 animate-[float_4s_ease-in-out_infinite]" />
        <div className="absolute w-24 h-24 bg-amber-300 opacity-20 top-40 right-20 rounded-2xl animate-[float_3.5s_ease-in-out_0.5s_infinite]" />
        <div className="absolute w-28 h-28 bg-orange-400 opacity-20 bottom-20 left-1/4 rounded-xl rotate-45 animate-[float_4.5s_ease-in-out_1s_infinite]" />
        <div className="absolute w-20 h-20 bg-teal-500 opacity-20 bottom-40 right-1/3 rounded-lg animate-[float_3s_ease-in-out_1.5s_infinite]" />
    </>
);

// Button Components
const ButtonShowcase = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-800 mb-4">Buttons</h2>

        <div className="space-y-4">
            <button className="w-full py-4 px-8 text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-2xl transform transition hover:scale-105 active:scale-95">
                Primary Button
            </button>

            <button className="w-full py-4 px-8 text-lg font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full shadow-2xl transform transition hover:scale-105 active:scale-95">
                Secondary Button
            </button>

            <button className="w-full py-3 px-6 text-base font-semibold text-gray-800 bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg transform transition hover:bg-white/80 active:scale-95">
                Glass Button
            </button>

            <button className="w-full py-3 px-6 text-base font-semibold text-teal-600 border-2 border-teal-500 rounded-2xl transform transition hover:bg-teal-50 active:scale-95">
                Outline Button
            </button>

            <div className="flex gap-3">
                <button className="flex-1 py-3 px-6 text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg transform transition hover:scale-105 active:scale-95">
                    <Check className="inline w-5 h-5 mr-2" />
                    Success
                </button>

                <button className="flex-1 py-3 px-6 text-base font-semibold text-white bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl shadow-lg transform transition hover:scale-105 active:scale-95">
                    <X className="inline w-5 h-5 mr-2" />
                    Cancel
                </button>
            </div>
        </div>
    </div>
);

// Card Components
const CardShowcase = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-800 mb-4">Cards</h2>

        {/* Course Card */}
        <div className="bg-white/40 backdrop-blur-lg rounded-3xl p-6 shadow-xl transform transition hover:scale-105 hover:shadow-2xl">
            <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">🇪🇸</div>
                <span className="bg-teal-500 text-white text-sm font-bold px-3 py-1 rounded-full">$35</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Spanish Masterclass</h3>
            <p className="text-sm text-teal-700 mb-4">Beginner • 24 Lessons</p>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">4.8</span>
                </div>
                <button className="text-teal-600 font-semibold text-sm">
                    View Details <ChevronRight className="inline w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-3xl p-6 shadow-xl text-white">
            <Award className="w-12 h-12 mb-3" />
            <h3 className="text-2xl font-bold mb-2">Achievement Unlocked!</h3>
            <p className="text-white/90 mb-4">You've completed 7-day streak 🔥</p>
            <button className="w-full py-3 bg-white/20 backdrop-blur-lg rounded-2xl font-semibold hover:bg-white/30 transition">
                Claim Reward
            </button>
        </div>

        {/* Stats Card */}
        <div className="bg-white/40 backdrop-blur-lg rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Your Progress</h3>
                <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-3xl font-black text-teal-600">128</div>
                    <div className="text-xs text-gray-600">Words</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-black text-amber-600">7</div>
                    <div className="text-xs text-gray-600">Day Streak</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-black text-orange-600">12</div>
                    <div className="text-xs text-gray-600">Lessons</div>
                </div>
            </div>
        </div>
    </div>
);

// Input Components
const InputShowcase = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-800 mb-4">Inputs</h2>

        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
                <input
                    type="text"
                    placeholder="Search courses..."
                    className="w-full py-4 pl-12 pr-4 text-base bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800 placeholder-teal-600"
                />
            </div>

            {/* Email Input */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full py-3 px-4 bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800"
                />
            </div>

            {/* Select/Dropdown */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Language Level</label>
                <select className="w-full py-3 px-4 bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800">
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Native</option>
                </select>
            </div>

            {/* Textarea */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Goals</label>
                <textarea
                    placeholder="What do you want to achieve?"
                    rows="4"
                    className="w-full py-3 px-4 bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800 placeholder-gray-500 resize-none"
                />
            </div>
        </div>
    </div>
);

// Badge & Tag Components
const BadgeShowcase = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-800 mb-4">Badges & Tags</h2>

        <div className="flex flex-wrap gap-3">
      <span className="px-4 py-2 bg-teal-500 text-white text-sm font-bold rounded-full">
        Beginner
      </span>
            <span className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-full">
        Popular
      </span>
            <span className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-full">
        New
      </span>
            <span className="px-4 py-2 bg-cyan-500 text-white text-sm font-bold rounded-full">
        Premium
      </span>
        </div>

        <div className="flex flex-wrap gap-3">
      <span className="px-3 py-1 bg-white/60 backdrop-blur-lg text-gray-800 text-sm font-semibold rounded-full shadow">
        🇪🇸 Spanish
      </span>
            <span className="px-3 py-1 bg-white/60 backdrop-blur-lg text-gray-800 text-sm font-semibold rounded-full shadow">
        🇫🇷 French
      </span>
            <span className="px-3 py-1 bg-white/60 backdrop-blur-lg text-gray-800 text-sm font-semibold rounded-full shadow">
        🇯🇵 Japanese
      </span>
            <span className="px-3 py-1 bg-white/60 backdrop-blur-lg text-gray-800 text-sm font-semibold rounded-full shadow">
        🇩🇪 German
      </span>
        </div>
    </div>
);

// List Components
const ListShowcase = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-800 mb-4">Lists</h2>

        {/* Lesson List */}
        <div className="space-y-3">
            {[
                { title: 'Introduction to Greetings', duration: '15:50', locked: false },
                { title: 'Basic Vocabulary', duration: '25:20', locked: false },
                { title: 'Pronunciation Guide', duration: '34:50', locked: true },
            ].map((item, idx) => (
                <div
                    key={idx}
                    className="flex items-center justify-between bg-white/50 backdrop-blur-lg rounded-2xl p-4 shadow-lg hover:bg-white/70 transition cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                            {idx + 1}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                            <p className="text-xs text-teal-700">Interactive Lesson</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-700">{item.duration}</span>
                        {item.locked ? (
                            <Lock className="w-5 h-5 text-gray-400" />
                        ) : (
                            <Play className="w-5 h-5 text-teal-600" />
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Feature List */}
        <div className="bg-white/40 backdrop-blur-lg rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Premium Features</h3>
            <div className="space-y-3">
                {[
                    'Unlimited access to all courses',
                    'Offline mode available',
                    'Certificate of completion',
                    'Priority support'
                ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Navigation Components
const NavigationShowcase = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-800 mb-4">Navigation</h2>

        {/* Top Bar */}
        <div className="flex items-center justify-between bg-white/60 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
            <button className="p-2 hover:bg-white/50 rounded-xl transition">
                <Menu className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Chameleon</h1>
            <button className="p-2 hover:bg-white/50 rounded-xl transition relative">
                <Bell className="w-6 h-6 text-gray-800" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
        </div>

        {/* Bottom Navigation */}
        <div className="grid grid-cols-4 gap-2 bg-white/60 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
            {[
                { icon: BookOpen, label: 'Learn', active: true },
                { icon: Globe, label: 'Explore', active: false },
                { icon: Award, label: 'Progress', active: false },
                { icon: User, label: 'Profile', active: false },
            ].map((item, idx) => (
                <button
                    key={idx}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl transition ${
                        item.active
                            ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white'
                            : 'text-gray-600 hover:bg-white/50'
                    }`}
                >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{item.label}</span>
                </button>
            ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-white/60 backdrop-blur-lg rounded-2xl p-2 shadow-lg">
            <button className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-xl">
                All
            </button>
            <button className="flex-1 py-2 px-4 text-gray-700 text-sm font-semibold rounded-xl hover:bg-white/50 transition">
                Popular
            </button>
            <button className="flex-1 py-2 px-4 text-gray-700 text-sm font-semibold rounded-xl hover:bg-white/50 transition">
                New
            </button>
        </div>
    </div>
);

// Progress Components
const ProgressShowcase = () => (
    <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-800 mb-4">Progress</h2>

        {/* Linear Progress */}
        <div className="bg-white/40 backdrop-blur-lg rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Course Progress</span>
                <span className="text-sm font-bold text-teal-600">65%</span>
            </div>
            <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
                <div className="h-full w-[65%] bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full"></div>
            </div>
        </div>

        {/* Circular Progress */}
        <div className="bg-white/40 backdrop-blur-lg rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-white/60"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray="352"
                            strokeDashoffset="88"
                            strokeLinecap="round"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#14b8a6" />
                                <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-gray-800">75%</span>
                        <span className="text-xs text-gray-600">Complete</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Step Progress */}
        <div className="bg-white/40 backdrop-blur-lg rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((step, idx) => (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                    idx < 2
                                        ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white'
                                        : 'bg-white/60 text-gray-600'
                                }`}
                            >
                                {idx < 2 ? <Check className="w-5 h-5" /> : step}
                            </div>
                            <span className="text-xs text-gray-600 mt-1">Step {step}</span>
                        </div>
                        {idx < 3 && (
                            <div className={`flex-1 h-1 mx-2 ${idx < 1 ? 'bg-teal-500' : 'bg-white/60'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    </div>
);

// Modal Component
const ModalShowcase = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-800 mb-4">Modal</h2>

            <button
                onClick={() => setShowModal(true)}
                className="w-full py-4 px-8 text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-2xl transform transition hover:scale-105 active:scale-95"
            >
                Show Modal
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl max-w-md w-full transform transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-gray-800">Unlock Premium</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-200/50 rounded-xl transition"
                            >
                                <X className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">🦎</div>
                                <p className="text-gray-600">
                                    Get unlimited access to all courses and features
                                </p>
                            </div>

                            <div className="space-y-3 mb-6">
                                {['All courses unlocked', 'Offline mode', 'Certificate'].map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-teal-600" />
                                        <span className="text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full py-4 px-8 text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-2xl transform transition hover:scale-105 active:scale-95"
                        >
                            Upgrade Now - $9.99/mo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main App
const App = () => {
    const [activeTab, setActiveTab] = useState('buttons');

    const tabs = [
        { id: 'buttons', label: 'Buttons', component: ButtonShowcase },
        { id: 'cards', label: 'Cards', component: CardShowcase },
        { id: 'inputs', label: 'Inputs', component: InputShowcase },
        { id: 'badges', label: 'Badges', component: BadgeShowcase },
        { id: 'lists', label: 'Lists', component: ListShowcase },
        { id: 'navigation', label: 'Navigation', component: NavigationShowcase },
        { id: 'progress', label: 'Progress', component: ProgressShowcase },
        { id: 'modal', label: 'Modal', component: ModalShowcase },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || ButtonShowcase;

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-200 via-cyan-100 to-teal-200 relative overflow-hidden">
            <FloatingBg />

            <div className="relative z-10 max-w-2xl mx-auto p-6 pb-32">
                <div className="text-center mb-8 pt-8">
                    <div className="text-6xl mb-4">🦎</div>
                    <h1 className="text-5xl font-black text-gray-800 mb-2">CHAMELEON</h1>
                    <p className="text-lg text-gray-700">Component Showcase</p>
                </div>

                {/* Tab Navigation */}
                <div className="mb-8 bg-white/60 backdrop-blur-lg rounded-2xl p-2 shadow-lg overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-semibold rounded-xl transition whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                                        : 'text-gray-700 hover:bg-white/50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Component Display */}
                <div className="bg-white/30 backdrop-blur-lg rounded-3xl p-8 shadow-xl">
                    <ActiveComponent />
                </div>
            </div>
        </div>
    );
};

export default App;