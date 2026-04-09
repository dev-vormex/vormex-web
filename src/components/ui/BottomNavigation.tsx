'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';

interface NavItem {
    title: string;
    href: string;
    icon: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
    badge?: number;
    menuItems?: NavItem[];
}

interface BottomNavigationProps {
    items: NavItem[];
    className?: string;
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
    const router = useRouter();
    const [openMenuHref, setOpenMenuHref] = useState<string | null>(null);


    const handleVibrate = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    const prefetchRoute = (href: string) => {
        if (!href || href === '#create') return;
        router.prefetch(href);
    };

    const closeMenu = () => setOpenMenuHref(null);

    return (
        <>
            <AnimatePresence>
                {openMenuHref && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Close navigation menu"
                            className="fixed inset-0 z-40 bg-black/20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeMenu}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ type: "spring", stiffness: 280, damping: 26 }}
                            className="fixed bottom-[96px] left-1/2 z-50 w-[calc(100vw-32px)] max-w-[400px] -translate-x-1/2 rounded-[28px] border border-white/10 bg-[#1e1e1e]/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-white">Quick Access</p>
                                <button
                                    type="button"
                                    onClick={closeMenu}
                                    className="rounded-full px-2 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {items
                                    .find((item) => item.href === openMenuHref)
                                    ?.menuItems?.map((menuItem, index) => (
                                        <Link
                                            key={menuItem.href + index}
                                            href={menuItem.href}
                                            onClick={() => {
                                                handleVibrate();
                                                closeMenu();
                                                menuItem.onClick?.();
                                            }}
                                            className="flex min-h-20 flex-col items-start justify-between rounded-2xl bg-white/6 p-3 text-left transition-colors hover:bg-white/10"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                                                <div className="h-5 w-5">
                                                    {menuItem.icon}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{menuItem.title}</p>
                                                <p className="text-xs text-white/55">Open {menuItem.title}</p>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className={cn(
                "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
                "w-[calc(100vw-32px)] max-w-[400px]",
                "h-[72px]", // Height 60-72px
                "bg-[#1e1e1e]/90 backdrop-blur-md", // Dark background with blur
                "rounded-[28px]", // Border radius 24-28px
                "shadow-xl shadow-black/20", // Elevated shadow
                "flex items-center justify-between px-2",
                "safe-area-inset-bottom",
                className
            )}>
                {items.map((item, index) => {
                    const isActive = item.isActive;

                    return (
                        <div key={item.href + index} className="relative flex-1 flex items-center justify-center h-full">
                            {(isActive || openMenuHref === item.href) && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute bg-[#9EFF00] rounded-[24px]"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    style={{
                                        width: '64px', // Approx pill width
                                        height: '48px', // Pill height
                                        zIndex: 0
                                    }}
                                />
                            )}

                            <Link
                                href={item.href}
                                onMouseEnter={() => prefetchRoute(item.href)}
                                onFocus={() => prefetchRoute(item.href)}
                                onTouchStart={() => prefetchRoute(item.href)}
                                onClick={(e) => {
                                    handleVibrate();

                                    if (item.menuItems?.length) {
                                        e.preventDefault();
                                        setOpenMenuHref((current) => current === item.href ? null : item.href);
                                        return;
                                    }

                                    closeMenu();

                                    if (item.onClick) {
                                        e.preventDefault();
                                        item.onClick();
                                    }
                                }}
                                className={cn(
                                    "relative z-10 flex items-center justify-center w-full h-full",
                                    "transition-colors duration-300",
                                    isActive || openMenuHref === item.href ? "text-[#1E1E1E]" : "text-white/60 hover:text-white"
                                )}
                            >
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className="flex flex-col items-center justify-center w-full h-full"
                                >
                                    {/* Icon Container */}
                                    <div className="relative">
                                        <div className={cn("w-6 h-6", isActive || openMenuHref === item.href ? "text-[#1E1E1E]" : "text-current")}>
                                            {item.icon}
                                        </div>

                                        {/* Badge */}
                                        {item.badge && item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#1E1E1E]">
                                                {item.badge > 9 ? '9+' : item.badge}
                                            </span>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className={cn(
                                        "text-[10px] font-medium transition-all duration-300 mt-1",
                                        isActive || openMenuHref === item.href ? "text-[#1E1E1E] font-bold" : "text-white/60"
                                    )}>
                                        {item.title}
                                    </span>
                                </motion.div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
