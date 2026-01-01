'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  Star,
  MapPin,
  Users,
  Shield,
  Building2,
  DollarSign,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Play,
  Rocket,
  Crown,
  Lock,
  Verified,
  Home,
  TrendingUp,
  Award,
  Zap,
  Globe,
  Heart,
  Target,
  Gift,
  Eye,
  UserCheck
} from 'lucide-react'
import Image from 'next/image'

export default function HomePage() {
  const [stats, setStats] = useState({
    properties: 0,
    customers: 0,
    cities: 0,
    savings: 0
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        properties: 50000,
        customers: 25000,
        cities: 50,
        savings: 500
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-full mb-8 shadow-lg border border-teal-100 dark:border-teal-800">
              <Building2 className="text-teal-600 dark:text-teal-400" size={20} />
              <span className="text-teal-700 dark:text-teal-300 font-semibold">INDIA'S SMARTEST PROPERTY PLATFORM</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              India's Smartest Way to
              <span className="block bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 dark:from-teal-400 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
                Buy, Sell & Rent Property
              </span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Transparent pricing. Zero pressure. Optional assistance. Built for India.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl space-x-2"
              >
                <span>Explore Properties</span>
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/dashboard/listings/new"
                className="inline-flex items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl space-x-2 border border-teal-200 dark:border-teal-700"
              >
                <Building2 size={20} />
                <span>List Your Property @ ₹1000</span>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* What is GharBazaar */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center space-x-2 bg-teal-100 dark:bg-teal-900/30 px-4 py-2 rounded-full mb-6">
                <Building2 className="text-teal-600 dark:text-teal-400" size={20} />
                <span className="text-teal-700 dark:text-teal-300 font-semibold">WHAT IS GHARBAZAAR</span>
              </div>

              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                India's Most Transparent Property Platform
              </h2>

              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                GharBazaar is built to remove confusion, pressure, and unfair commissions from Indian real estate.
                We believe every family deserves a transparent, affordable way to find their dream home.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="text-teal-600 dark:text-teal-400 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Flat ₹1000 Listing Fee</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">One-time payment until sold/rented. No recurring charges</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <CheckCircle className="text-teal-600 dark:text-teal-400 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Free Property Browsing</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Buyers and renters explore all properties completely free</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <CheckCircle className="text-teal-600 dark:text-teal-400 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Optional Premium Features</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Pay only if you want direct contact features</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-3xl p-8 border border-teal-200 dark:border-teal-800">
                  <div className="aspect-square bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 rounded-2xl flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <Image
                        src="/images/gharbazaar logo.jpeg"
                        alt="GharBazaar Logo"
                        width={300}
                        height={300}
                        className="object-contain rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-400/20 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-emerald-400/20 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose GharBazaar */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 rounded-full mb-6">
              <Zap className="text-emerald-600 dark:text-emerald-400" size={20} />
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">WHY CHOOSE GHARBAZAAR</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Why Choose GharBazaar?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto">
              Experience the future of real estate with our transparent, efficient platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">No Hidden Charges</h3>
              <p className="text-gray-600 dark:text-gray-300">Complete transparency in pricing. What you see is what you pay - no surprise fees.</p>
            </div>

            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Verified Properties</h3>
              <p className="text-gray-600 dark:text-gray-300">Every property is verified by our team with industry-leading security standards.</p>
            </div>

            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Direct Contact</h3>
              <p className="text-gray-600 dark:text-gray-300">Connect directly with property owners. No middlemen, just honest deals.</p>
            </div>

            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Choice Always</h3>
              <p className="text-gray-600 dark:text-gray-300">You decide how much help you want, when you want it. Complete control in your hands.</p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Built for India, Trusted by Indians</h3>
              <p className="text-gray-600 dark:text-gray-300">Understanding Indian market realities and building solutions that work</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-200 dark:border-teal-700">
                <Globe className="text-teal-600 dark:text-teal-400 mx-auto mb-4" size={40} />
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Local Market Knowledge</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Deep understanding of Indian cities and regional preferences</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-700">
                <Lock className="text-emerald-600 dark:text-emerald-400 mx-auto mb-4" size={40} />
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">RERA Compliant</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Full compliance with Indian property laws and regulations</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-2xl border border-blue-200 dark:border-blue-700">
                <Heart className="text-blue-600 dark:text-blue-400 mx-auto mb-4" size={40} />
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Family-First Approach</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Understanding Indian family dynamics in property decisions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white dark:bg-gray-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto">
              Real experiences from families who found their dream homes through GharBazaar
            </p>
          </div>

          <div className="relative">
            <div className="flex animate-slide space-x-8">
              {/* Testimonial Cards */}
              {[
                {
                  name: "Rajesh Kumar",
                  location: "Mumbai",
                  rating: 5,
                  text: "Found my dream apartment without any broker hassle. The ₹1000 listing fee saved me lakhs compared to traditional brokers.",
                  avatar: "RK"
                },
                {
                  name: "Priya Sharma",
                  location: "Delhi",
                  rating: 5,
                  text: "Transparent pricing and direct contact with owners made the entire process stress-free. Highly recommended!",
                  avatar: "PS"
                },
                {
                  name: "Amit Patel",
                  location: "Bangalore",
                  rating: 5,
                  text: "Listed my property and got genuine buyers within a week. No pressure tactics, just honest service.",
                  avatar: "AP"
                },
                {
                  name: "Sneha Gupta",
                  location: "Pune",
                  rating: 5,
                  text: "The verification process gave me confidence. Every property detail was accurate and up-to-date.",
                  avatar: "SG"
                },
                {
                  name: "Vikram Singh",
                  location: "Hyderabad",
                  rating: 5,
                  text: "Best platform for property rental. Found tenants quickly with complete transparency in the process.",
                  avatar: "VS"
                },
                {
                  name: "Meera Joshi",
                  location: "Chennai",
                  rating: 5,
                  text: "No hidden charges, no surprise fees. What they promise is exactly what you get. Excellent service!",
                  avatar: "MJ"
                }
              ].concat([
                {
                  name: "Rajesh Kumar",
                  location: "Mumbai",
                  rating: 5,
                  text: "Found my dream apartment without any broker hassle. The ₹1000 listing fee saved me lakhs compared to traditional brokers.",
                  avatar: "RK"
                },
                {
                  name: "Priya Sharma",
                  location: "Delhi",
                  rating: 5,
                  text: "Transparent pricing and direct contact with owners made the entire process stress-free. Highly recommended!",
                  avatar: "PS"
                },
                {
                  name: "Amit Patel",
                  location: "Bangalore",
                  rating: 5,
                  text: "Listed my property and got genuine buyers within a week. No pressure tactics, just honest service.",
                  avatar: "AP"
                },
                {
                  name: "Sneha Gupta",
                  location: "Pune",
                  rating: 5,
                  text: "The verification process gave me confidence. Every property detail was accurate and up-to-date.",
                  avatar: "SG"
                },
                {
                  name: "Vikram Singh",
                  location: "Hyderabad",
                  rating: 5,
                  text: "Best platform for property rental. Found tenants quickly with complete transparency in the process.",
                  avatar: "VS"
                },
                {
                  name: "Meera Joshi",
                  location: "Chennai",
                  rating: 5,
                  text: "No hidden charges, no surprise fees. What they promise is exactly what you get. Excellent service!",
                  avatar: "MJ"
                }
              ]).map((testimonial, index) => (
                <div key={index} className="flex-shrink-0 w-80 p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{testimonial.name}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{testimonial.location}</p>
                    </div>
                    <div className="ml-auto">
                      <div className="flex space-x-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="text-yellow-400 fill-current" size={16} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">"{testimonial.text}"</p>
                </div>
              ))}
            </div>

            {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-white dark:from-gray-950 to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-white dark:from-gray-950 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gradient-to-br from-teal-600 via-emerald-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Join thousands of satisfied customers who have found their perfect properties through GharBazaar
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/dashboard"
              className="bg-white hover:bg-gray-50 text-teal-600 px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <span>Start Exploring</span>
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/contact"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <MessageCircle size={20} />
              <span>Contact Us</span>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <Phone className="text-white mx-auto mb-4" size={32} />
              <h3 className="text-white font-bold mb-2">Call Us</h3>
              <p className="text-teal-100">+91 98765 43210</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <Mail className="text-white mx-auto mb-4" size={32} />
              <h3 className="text-white font-bold mb-2">Email Us</h3>
              <p className="text-teal-100">Gharbazaarofficial@zohomail.in</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <Clock className="text-white mx-auto mb-4" size={32} />
              <h3 className="text-white font-bold mb-2">Support Hours</h3>
              <p className="text-teal-100">24/7 Available</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}