'use client'

import { useState } from 'react'
import {
  MessageCircle,
  Search,
  Send,
  Phone,
  Mail,
  MapPin,
  Building2,
  CheckCircle,
  Clock,
  Filter,
  AlertCircle,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  Archive,
  Star,
  Shield,
  Home,
  Users,
  Hammer
} from 'lucide-react'

export default function MessagesPage() {
  const [selectedTab, setSelectedTab] = useState('all')
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null)
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [userRole, setUserRole] = useState<'buyer' | 'renter'>('buyer')

  // Sample messages data - From buyer/renter perspective contacting sellers
  const messages = [
    {
      id: 1,
      sellerName: 'Rajesh Kumar',
      sellerType: 'Property Owner',
      sellerAvatar: 'RK',
      property: {
        title: 'Luxury Penthouse in Worli',
        location: 'Worli, Mumbai',
        price: '₹8.5 Cr',
        type: 'Penthouse',
        bedrooms: 4,
        bathrooms: 5,
        area: '3500 sq ft'
      },
      listingType: 'sale',
      lastMessage: 'Thank you for your interest! The property is available for viewing this weekend. Would you like to schedule a visit?',
      lastMessageTime: '10:30 AM',
      date: 'Today',
      status: 'replied',
      unreadCount: 0,
      isOnline: true,
      verified: true,
      rating: 4.8,
      phone: '+91 98765 43210',
      email: 'rajesh@email.com',
      conversation: [
        {
          id: 1,
          sender: 'me',
          message: 'Hi, I am very interested in your penthouse listing in Worli. Can we schedule a visit this weekend? Also, is there any scope for price negotiation?',
          time: '9:45 AM',
          date: 'Today'
        },
        {
          id: 2,
          sender: 'seller',
          message: 'Thank you for your interest! The property is available for viewing this weekend. Would you like to schedule a visit?',
          time: '10:30 AM',
          date: 'Today'
        }
      ]
    },
    {
      id: 2,
      sellerName: 'Priya Sharma',
      sellerType: 'Real Estate Agent',
      sellerAvatar: 'PS',
      property: {
        title: 'Premium 3BHK Apartment',
        location: 'Bandra West, Mumbai',
        price: '₹85,000/month',
        type: 'Apartment',
        bedrooms: 3,
        bathrooms: 3,
        area: '1800 sq ft'
      },
      listingType: 'rent',
      lastMessage: 'The apartment is fully furnished and ready for immediate possession. Security deposit is 3 months rent.',
      lastMessageTime: '2:45 PM',
      date: 'Yesterday',
      status: 'new',
      unreadCount: 2,
      isOnline: false,
      verified: true,
      rating: 4.7,
      phone: '+91 87654 32109',
      email: 'priya@email.com',
      conversation: [
        {
          id: 1,
          sender: 'me',
          message: 'Looking for a fully furnished 3BHK apartment for rent. Is this available from February? What are the lease terms?',
          time: '1:30 PM',
          date: 'Yesterday'
        },
        {
          id: 2,
          sender: 'seller',
          message: 'Yes, it\'s available from February 1st. The lease is for minimum 11 months.',
          time: '2:15 PM',
          date: 'Yesterday'
        },
        {
          id: 3,
          sender: 'seller',
          message: 'The apartment is fully furnished and ready for immediate possession. Security deposit is 3 months rent.',
          time: '2:45 PM',
          date: 'Yesterday'
        }
      ]
    },
    {
      id: 3,
      sellerName: 'Amit Patel',
      sellerType: 'Builder Representative',
      sellerAvatar: 'AP',
      property: {
        title: 'Modern Villa with Garden',
        location: 'Whitefield, Bangalore',
        price: '₹1.2 Cr',
        type: 'Villa',
        bedrooms: 3,
        bathrooms: 4,
        area: '2200 sq ft'
      },
      listingType: 'sale',
      lastMessage: 'We have financing options available and the property is ready for immediate possession. Would you like to visit our site office?',
      lastMessageTime: '9:15 AM',
      date: 'Today',
      status: 'replied',
      unreadCount: 0,
      isOnline: true,
      verified: true,
      rating: 4.6,
      phone: '+91 76543 21098',
      email: 'amit@email.com',
      conversation: [
        {
          id: 1,
          sender: 'me',
          message: 'Is this villa available for immediate possession? Do you provide home loan assistance?',
          time: '8:30 AM',
          date: 'Today'
        },
        {
          id: 2,
          sender: 'seller',
          message: 'We have financing options available and the property is ready for immediate possession. Would you like to visit our site office?',
          time: '9:15 AM',
          date: 'Today'
        }
      ]
    },
    {
      id: 4,
      sellerName: 'Sneha Reddy',
      sellerType: 'Property Owner',
      sellerAvatar: 'SR',
      property: {
        title: 'Cozy 2BHK Flat',
        location: 'Koramangala, Bangalore',
        price: '₹35,000/month',
        type: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200 sq ft'
      },
      listingType: 'rent',
      lastMessage: 'Yes, the flat is available for rent from next month. Maintenance charges are ₹3,500 per month.',
      lastMessageTime: '11:20 AM',
      date: '2 days ago',
      status: 'archived',
      unreadCount: 0,
      isOnline: false,
      verified: false,
      rating: 4.3,
      phone: '+91 65432 10987',
      email: 'sneha@email.com',
      conversation: [
        {
          id: 1,
          sender: 'me',
          message: 'Looking for a 2BHK flat for rent near Koramangala. What are the maintenance charges?',
          time: '10:45 AM',
          date: '2 days ago'
        },
        {
          id: 2,
          sender: 'seller',
          message: 'Yes, the flat is available for rent from next month. Maintenance charges are ₹3,500 per month.',
          time: '11:20 AM',
          date: '2 days ago'
        }
      ]
    }
  ]

  const getFilteredMessages = () => {
    let filtered = messages

    // Filter by user role
    if (userRole === 'buyer') {
      filtered = messages.filter(msg => msg.listingType === 'sale')
    } else if (userRole === 'renter') {
      filtered = messages.filter(msg => msg.listingType === 'rent')
    }

    // Filter by tab
    if (selectedTab === 'new') {
      filtered = filtered.filter(msg => msg.status === 'new')
    } else if (selectedTab === 'replied') {
      filtered = filtered.filter(msg => msg.status === 'replied')
    } else if (selectedTab === 'archived') {
      filtered = filtered.filter(msg => msg.status === 'archived')
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(msg =>
        msg.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.property.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }

  const getTabCount = (tab: string) => {
    let baseMessages = messages

    // Filter by user role first
    if (userRole === 'buyer') {
      baseMessages = messages.filter(msg => msg.listingType === 'sale')
    } else if (userRole === 'renter') {
      baseMessages = messages.filter(msg => msg.listingType === 'rent')
    }

    switch (tab) {
      case 'all': return baseMessages.length
      case 'new': return baseMessages.filter(msg => msg.status === 'new').length
      case 'replied': return baseMessages.filter(msg => msg.status === 'replied').length
      case 'archived': return baseMessages.filter(msg => msg.status === 'archived').length
      default: return 0
    }
  }

  const getSellerTypeColor = (type: string) => {
    switch (type) {
      case 'Property Owner': return 'bg-green-600'
      case 'Real Estate Agent': return 'bg-blue-600'
      case 'Builder Representative': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  const getSellerTypeIcon = (type: string) => {
    switch (type) {
      case 'Property Owner': return Home
      case 'Real Estate Agent': return Users
      case 'Builder Representative': return Hammer
      default: return Building2
    }
  }

  const getQuickResponses = (listingType: string) => {
    if (listingType === 'sale') {
      return [
        'When can I schedule a visit?',
        'Is the price negotiable?',
        'Do you provide home loan assistance?',
        'What documents are required?',
        'Can I get a virtual tour?',
        'What is the possession timeline?'
      ]
    } else {
      return [
        'When can I view the property?',
        'What is the security deposit?',
        'Are pets allowed?',
        'What are the lease terms?',
        'Is it fully furnished?',
        'What utilities are included?'
      ]
    }
  }

  const selectedMessageData = messages.find(msg => msg.id === selectedMessage)

  return (
    <>
      <style jsx>{`
        .messages-scroll::-webkit-scrollbar {
          width: 12px;
        }
        .messages-scroll::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }
        .messages-scroll::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 10px;
          border: 2px solid #f3f4f6;
        }
        .messages-scroll::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .dark .messages-scroll::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .dark .messages-scroll::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-color: #1f2937;
        }
        .dark .messages-scroll::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
      <div className="h-[calc(100vh-8rem)] flex bg-gray-50 dark:bg-gray-900">
        {/* Left Panel - Messages List */}
        <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Messages</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Chat with sellers and agents</p>
              </div>
            </div>

            {/* User Role Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I am looking to:</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as 'buyer' | 'renter')}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="buyer">🏠 Buy Property</option>
                <option value="renter">🔑 Rent Property</option>
              </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="text-white" size={16} />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{getTabCount('all')}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">Total Chats</div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="text-white" size={16} />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{getTabCount('new')}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">New Messages</div>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <Filter size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 py-4">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {[
                { id: 'all', label: 'All', count: getTabCount('all') },
                { id: 'new', label: 'New', count: getTabCount('new') },
                { id: 'replied', label: 'Active', count: getTabCount('replied') },
                { id: 'archived', label: 'Closed', count: getTabCount('archived') }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex-1 px-2 py-2 rounded-md font-medium text-xs transition-all ${selectedTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Messages List */}
          <div
            className="flex-1 overflow-y-auto px-6 pb-6 messages-scroll"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#9ca3af #e5e7eb'
            }}
          >
            <div className="space-y-3">
              {getFilteredMessages().map((message) => {
                const SellerIcon = getSellerTypeIcon(message.sellerType)
                return (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedMessage === message.id
                      ? 'bg-purple-600 border-purple-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-650'
                      }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {message.sellerAvatar}
                        </div>
                        {message.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></div>
                        )}
                        {message.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {message.unreadCount}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-semibold text-sm truncate ${selectedMessage === message.id ? 'text-white' : 'text-gray-900 dark:text-white'
                              }`}>
                              {message.sellerName}
                            </h3>
                            {message.verified && (
                              <Shield size={12} className="text-blue-400" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs ${selectedMessage === message.id ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'
                              }`}>
                              {message.lastMessageTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-1">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${getSellerTypeColor(message.sellerType)}`}>
                            <SellerIcon size={10} className="text-white" />
                          </div>
                          <span className={`text-xs ${selectedMessage === message.id ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {message.sellerType}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${message.listingType === 'sale'
                            ? 'bg-blue-600 text-blue-100'
                            : 'bg-purple-600 text-purple-100'
                            }`}>
                            {message.listingType === 'sale' ? 'Sale' : 'Rent'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 mb-2">
                          <Building2 size={12} className={selectedMessage === message.id ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'} />
                          <span className={`text-xs truncate ${selectedMessage === message.id ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {message.property.title}
                          </span>
                        </div>

                        <p className={`text-xs line-clamp-2 ${selectedMessage === message.id ? 'text-purple-100' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                          {message.lastMessage}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs font-semibold ${selectedMessage === message.id ? 'text-purple-100' : 'text-gray-900 dark:text-gray-300'
                            }`}>
                            {message.property.price}
                          </span>
                          {message.unreadCount > 0 && (
                            <span className="text-red-400 text-xs font-medium">New messages</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Chat or Empty State */}
        <div className="flex-1 flex flex-col">
          {selectedMessage ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {selectedMessageData?.sellerAvatar}
                      </div>
                      {selectedMessageData?.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {selectedMessageData?.sellerName}
                        </h2>
                        {selectedMessageData?.verified && (
                          <Shield size={16} className="text-blue-400" />
                        )}
                        <div className="flex items-center space-x-1">
                          <Star size={14} className="text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{selectedMessageData?.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className={`px-2 py-1 rounded-full text-xs ${getSellerTypeColor(selectedMessageData?.sellerType || '')}`}>
                          {selectedMessageData?.sellerType}
                        </span>
                        <span>•</span>
                        <span className={selectedMessageData?.isOnline ? 'text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                          {selectedMessageData?.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                      <Phone size={20} />
                    </button>
                    <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                      <Mail size={20} />
                    </button>
                    <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>

                {/* Property Info */}
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedMessageData?.property.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <MapPin size={14} />
                          <span>{selectedMessageData?.property.location}</span>
                        </span>
                        <span>•</span>
                        <span>{selectedMessageData?.property.bedrooms} BHK</span>
                        <span>•</span>
                        <span>{selectedMessageData?.property.area}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedMessageData?.property.price}</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedMessageData?.listingType === 'sale'
                        ? 'bg-blue-600 text-blue-100'
                        : 'bg-purple-600 text-purple-100'
                        }`}>
                        For {selectedMessageData?.listingType === 'sale' ? 'Sale' : 'Rent'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div
                className="flex-1 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto messages-scroll"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9ca3af #e5e7eb'
                }}
              >
                <div className="space-y-4">
                  {selectedMessageData?.conversation.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md px-4 py-3 rounded-lg ${msg.sender === 'me'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                          {msg.sender === 'me' ? 'You' : selectedMessageData?.sellerName} • {msg.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Responses */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
                <div className="flex flex-wrap gap-2">
                  {getQuickResponses(selectedMessageData?.listingType || 'sale').slice(0, 3).map((response, index) => (
                    <button
                      key={index}
                      onClick={() => setMessageText(response)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full text-xs transition-all"
                    >
                      {response}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Message ${selectedMessageData?.sellerName}...`}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                      <Paperclip size={18} />
                    </button>
                    <button className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                      <ImageIcon size={18} />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (messageText.trim()) {
                        console.log('Send message:', messageText)
                        setMessageText('')
                      }
                    }}
                    disabled={!messageText.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send size={18} />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle size={48} className="text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select a conversation</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Choose a message from the list to start chatting with sellers and agents
                </p>
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md">
                  <h4 className="text-gray-900 dark:text-white font-semibold mb-2">💡 Tips for messaging:</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
                    <li>• Be specific about your requirements</li>
                    <li>• Ask about viewing schedules</li>
                    <li>• Inquire about pricing and negotiations</li>
                    <li>• Request property documents</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}