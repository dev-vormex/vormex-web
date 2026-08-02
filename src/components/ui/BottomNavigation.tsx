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
                            className="fixed bottom-[66px] left-1/2 z-50 w-[calc(100vw-24px)] max-w-[380px] -translate-x-1/2 rounded-[22px] border border-slate-700/60 bg-[#121827]/95 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
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
                "fixed bottom-2.5 left-1/2 z-50 -translate-x-1/2",
                "h-[50px] w-[calc(100vw-24px)] max-w-[380px]",
                "border border-slate-700/60 bg-gradient-to-b from-[#182033]/95 to-[#111725]/95 backdrop-blur-xl",
                "rounded-[20px]",
                "shadow-lg shadow-slate-950/25",
                "flex items-center justify-between px-1.5",
                "safe-area-inset-bottom",
                className
            )}>
                {items.map((item, index) => {
                    const isActive = item.isActive;
                    const isHighlighted = isActive || openMenuHref === item.href;

                    return (
                        <div key={item.href + index} className="relative flex-1 flex items-center justify-center h-full">
                            <Link
                                href={item.href}
                                aria-label={item.title}
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
                                    "relative flex h-full w-full items-center justify-center",
                                    "transition-colors duration-300",
                                    isHighlighted ? "text-white" : "text-slate-400 hover:text-slate-100"
                                )}
                            >
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className="flex h-full w-full items-center justify-center"
                                >
                                    {/* Icon Container */}
                                    <div className="relative flex h-8 w-10 items-center justify-center">
                                        {isHighlighted && (
                                            <motion.div
                                                layoutId="active-icon"
                                                className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-sm shadow-blue-950/40"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                                            />
                                        )}

                                        <div className="relative z-10 h-[17px] w-[17px] text-current sm:h-[19px] sm:w-[19px]">
                                            {item.icon}

                                            {/* Badge */}
                                            {item.badge && item.badge > 0 && (
                                                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#151c2c]">
                                                    {item.badge > 9 ? '9+' : item.badge}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                </motion.div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
