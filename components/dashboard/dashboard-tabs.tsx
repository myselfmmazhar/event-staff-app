"use client";

import { useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface DashboardTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

/**
 * Dashboard Tabs Component
 * Provides tab navigation between different dashboard views
 * (Overview with cards, Upcoming Events table with mock data, etc.)
 */
export function DashboardTabs({ tabs, defaultTab }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-border px-6">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 text-sm font-medium transition-colors relative whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">{activeContent}</div>
    </div>
  );
}
