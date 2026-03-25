import { Page } from '../components/ui/Page';

const users = [
    {
        id: 'admin',
        label: 'Admin',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.628 5.372 12 12 12s12-5.372 12-12c0-2.244-.618-4.344-1.698-6.136" />
            </svg>
        ),
        color: 'from-violet-600 to-indigo-600',
        shadow: 'shadow-indigo-200',
        badge: 'Full Access',
    },
    {
        id: 'accounts',
        label: 'Accounts',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        color: 'from-emerald-500 to-teal-600',
        shadow: 'shadow-emerald-200',
        badge: 'Finance',
    },
    {
        id: 'sales',
        label: 'Sales Person',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
        ),
        color: 'from-amber-500 to-orange-500',
        shadow: 'shadow-amber-200',
        badge: 'Revenue',
    },
    {
        id: 'stock',
        label: 'Stock Manager',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
        color: 'from-sky-500 to-blue-600',
        shadow: 'shadow-sky-200',
        badge: 'Inventory',
    },
];

export function Homepage() {
    return (
        <Page className="min-h-[calc(100vh-56px)] flex items-center justify-center py-12">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center mb-5">
                    <img src="/pooja-dairy-logo.svg" width={240} height={120} className="" alt="Pooja-Dairy-Logo"  />
                </div>
                {/* Header */}
                <div className="text-center mb-10">
                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400 mb-2">
                        Welcome back
                    </p>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Who's signing in?
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">Select your profile to continue</p>
                </div>

                {/* User Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {users.map((user) => (
                        <a
                            href="/login"
                            key={user.id}
                            className="group relative flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                        >
                            {/* Icon circle */}
                            <div
                                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${user.color} text-white shadow-md ${user.shadow} transition-transform duration-200 group-hover:scale-105`}
                            >
                                {user.icon}
                            </div>

                            {/* Label */}
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-800 leading-tight">{user.label}</p>
                                <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 group-hover:bg-gray-200 transition-colors">
                                    {user.badge}
                                </span>
                            </div>

                            {/* Hover arrow */}
                            <span className="absolute right-3 top-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-gray-400">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </Page>
    );
}