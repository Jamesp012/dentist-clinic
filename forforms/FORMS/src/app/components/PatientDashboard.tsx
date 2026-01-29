import React from "react";
import {
  Users,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clock,
  ChevronRight,
  Star,
  Activity,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

export const PatientDashboard: React.FC = () => {
  const stats = [
    {
      label: "Total Patients",
      value: "1,284",
      icon: Users,
      color: "bg-blue-500",
      trend: "+12%",
    },
    {
      label: "Monthly Revenue",
      value: "$42,500",
      icon: TrendingUp,
      color: "bg-green-500",
      trend: "+8.4%",
    },
    {
      label: "Appointments",
      value: "24",
      icon: Calendar,
      color: "bg-purple-500",
      trend: "Today",
    },
    {
      label: "Pending Claims",
      value: "7",
      icon: AlertCircle,
      color: "bg-amber-500",
      trend: "-2",
    },
  ];

  const recentPatients = [
    {
      name: "Sarah Johnson",
      treatment: "Root Canal",
      status: "Post-op",
      time: "10:30 AM",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    },
    {
      name: "Michael Chen",
      treatment: "Consultation",
      status: "Waiting",
      time: "11:15 AM",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    },
    {
      name: "Emma Williams",
      treatment: "Deep Cleaning",
      status: "In-progress",
      time: "11:45 AM",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Clinic Overview
          </h2>
          <p className="text-slate-500">
            Welcome back, Dr. Elena Vance. Here's what's
            happening today.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            January 29, 2026
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`${stat.color} p-2.5 rounded-xl shadow-lg shadow-${stat.color.split("-")[1]}-100`}
              >
                <stat.icon className="text-white" size={24} />
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  stat.trend.startsWith("+")
                    ? "bg-green-100 text-green-700"
                    : stat.trend.startsWith("-")
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {stat.trend}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">
              {stat.label}
            </h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Today's Appointments
              </h3>
              <button className="text-blue-600 text-sm font-semibold hover:underline">
                View All
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentPatients.map((patient) => (
                <div
                  key={patient.name}
                  className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <ImageWithFallback
                      src={patient.image}
                      alt={patient.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white ring-1 ring-slate-100"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {patient.name}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {patient.treatment}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 text-right">
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Status
                      </p>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          patient.status === "Waiting"
                            ? "bg-amber-100 text-amber-700"
                            : patient.status === "In-progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {patient.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Time
                      </p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Clock
                          size={14}
                          className="text-slate-400"
                        />
                        {patient.time}
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-200">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md">
                <Star
                  size={16}
                  className="text-amber-300 fill-amber-300"
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Patient Success Stories
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-3 max-w-md">
                "My confidence has skyrocketed after the implant
                surgery."
              </h3>
              <p className="text-blue-100 opacity-90 mb-6">
                - Robert Miller, Patient since 2023
              </p>
              <button className="px-6 py-2.5 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors">
                View Feedback
              </button>
            </div>
            <div className="absolute top-0 right-0 p-8">
              <Activity
                className="text-white/10 w-48 h-48 -rotate-12"
                strokeWidth={1}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center justify-between">
              Clinic Capacity
              <span className="text-xs font-normal text-slate-400">
                Real-time
              </span>
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-600">
                    Chair 1 (Surgical)
                  </span>
                  <span className="font-bold text-blue-600">
                    85%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-[85%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-600">
                    Chair 2 (General)
                  </span>
                  <span className="font-bold text-green-600">
                    42%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full w-[42%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-600">
                    Chair 3 (Hygienist)
                  </span>
                  <span className="font-bold text-purple-600">
                    100%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full w-full"></div>
                </div>
              </div>
            </div>
            <p className="mt-8 text-xs text-slate-400 leading-relaxed text-center italic">
              Estimated wait time for walk-ins: 35 mins
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="font-bold text-slate-900 mb-4">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all text-center">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Calendar size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Schedule
                </span>
              </button>
              <button className="p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all text-center">
                <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Walk-in
                </span>
              </button>
              <button className="p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all text-center">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Activity size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Reports
                </span>
              </button>
              <button className="p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all text-center">
                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <AlertCircle size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Support
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};