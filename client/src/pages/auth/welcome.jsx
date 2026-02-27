import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Wallet, Receipt, Users, Calculator, BarChart3, TrendingUp, Heart, Menu } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#F0F9FA] text-gray-800 overflow-x-hidden">

      {/* ================= NAVBAR ================= */}
      <nav className="fixed top-0 w-full flex justify-between items-center px-4 sm:px-8 lg:px-16 py-4 bg-white shadow-lg border-b-2 border-[#06B6D4] z-50">
        <h1 className="text-xl sm:text-2xl font-bold text-[#06B6D4] flex items-center gap-2"><Wallet size={35} /> BillSplit</h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-3 lg:gap-4 items-center">

            <button onClick={() => navigate('/login')} className="
                relative
                text-sm lg:text-base
                text-gray-700
                font-medium
                px-3 py-2
                rounded-md
                transition-all duration-300 ease-in-out
                hover:text-[#0E7490]
                hover:bg-[#0E7490]
                active:scale-95
                focus:outline-none
                ">
                Login
            </button>

            <button onClick={() => navigate('/register')} className="
                px-4 py-2
                bg-gradient-to-r from-[#164E63] to-[#0E7490]
                text-white text-sm lg:text-base
                rounded-lg font-medium
                shadow-md
                transition-all duration-300 ease-in-out
                active:scale-95
                focus:outline-none
                hover:shadow-lg transform hover:scale-105
                ">
                Register
            </button>

    
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-700 hover:text-[#06B6D4]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b-2 border-[#06B6D4] md:hidden">
            <div className="flex flex-col gap-2 p-4">
              <button onClick={() => navigate('/login')} className="text-left text-gray-700 hover:text-[#06B6D4] transition font-medium py-2">
                Login
              </button>
              <button onClick={() => navigate('/register')} className="text-left text-gray-700 hover:text-[#06B6D4] transition font-medium py-2">
                Register
              </button>
              <button className="w-full px-4 py-2 bg-[#06B6D4] text-white rounded-md hover:bg-[#164E63] transition shadow-md text-sm font-medium">
                Enter Invitation Code
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ================= HERO ================= */}
      <section className="w-full min-h-screen flex flex-col lg:flex-row items-center justify-center pt-20 px-4 sm:px-8 lg:px-20 py-8 lg:py-20 gap-8 lg:gap-16 bg-gradient-to-br from-[#F0F9FA] via-[#67E8F9] to-[#F0F9FA]">

        {/* LEFT */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          <h2 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold text-[#164E63] leading-tight">
            Split Bills <br /> <span className="text-[#06B6D4]">Fairly & Easy</span>
          </h2>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg lg:text-lg text-gray-700 leading-relaxed">
            Create shared bills, invite friends, and track expenses easily. No more awkward conversations about who owes what.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <button onClick={() => navigate('/register')} 
            className="
                px-4 py-2
                bg-gradient-to-r from-[#164E63] to-[#0E7490]
                text-white text-sm lg:text-base
                rounded-lg font-medium
                shadow-md
                transition-all duration-300 ease-in-out
                active:scale-95
                focus:outline-none
                ">
              Get Started
            </button>

            <button className="  relative
                text-sm lg:text-base
                text-gray-700
                font-medium
                px-3 py-2
                rounded-md
                transition-all duration-300 ease-in-out
                hover:text-[#0E7490]
                hover:bg-[#0E7490]
                active:scale-95
                focus:outline-none
                border-none
                focus:ring-2 focus:ring-[#164E63]">
              Enter Invitation Code
            </button>
          </div>
        </div>

        {/* RIGHT ILLUSTRATION PLACEHOLDER */}
        <div className="w-full lg:w-1/2 flex justify-end items-center">
          <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md bg-gradient-to-br from-[#06B6D4] to-[#164E63] p-8 sm:p-12 rounded-3xl shadow-2xl text-center text-white hover:shadow-2xl transition">
            <div className="flex justify-center mb-4 animate-bounce"><TrendingUp size={150} /></div>
            <h3 className="text-xl sm:text-2xl font-bold">
              Expense Dashboard Preview
            </h3>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="w-full px-4 sm:px-8 lg:px-20 py-16 sm:py-20 bg-white">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-[#164E63] mb-8 sm:mb-12 lg:mb-16">
          How It Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">

          <div className="bg-gradient-to-br from-[#F0F9FA] to-[#67E8F9] p-6 sm:p-8 rounded-xl shadow-md border-2 border-[#06B6D4] text-center hover:shadow-lg hover:border-[#164E63] transition">
            <div className="flex justify-center mb-4"><Receipt size={48} className="text-[#06B6D4]" /></div>
            <h4 className="font-semibold text-[#164E63] mb-2 text-base sm:text-lg">
              Create a Bill
            </h4>
            <p className="text-sm sm:text-base text-gray-700">Create a shared expense in seconds.</p>
          </div>

          <div className="bg-gradient-to-br from-[#67E8F9] to-[#F0F9FA] p-6 sm:p-8 rounded-xl shadow-md border-2 border-[#06B6D4] text-center hover:shadow-lg hover:border-[#164E63] transition">
            <div className="flex justify-center mb-4"><Users size={48} className="text-[#06B6D4]" /></div>
            <h4 className="font-semibold text-[#164E63] mb-2 text-base sm:text-lg">
              Invite Friends
            </h4>
            <p className="text-sm sm:text-base text-gray-700">Send an invitation code or link.</p>
          </div>

          <div className="bg-gradient-to-br from-[#F0F9FA] to-[#67E8F9] p-6 sm:p-8 rounded-xl shadow-md border-2 border-[#06B6D4] text-center hover:shadow-lg hover:border-[#164E63] transition">
            <div className="flex justify-center mb-4"><Calculator size={48} className="text-[#06B6D4]" /></div>
            <h4 className="font-semibold text-[#164E63] mb-2 text-base sm:text-lg">
              Split Automatically
            </h4>
            <p className="text-sm sm:text-base text-gray-700">We calculate who owes who instantly.</p>
          </div>

        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="w-full px-4 sm:px-8 lg:px-20 py-16 sm:py-20 flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-16 items-center bg-[#F0F9FA]">

        {/* LEFT MOCKUP */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-start">
          <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md bg-gradient-to-br from-[#06B6D4] to-[#164E63] text-white p-8 sm:p-12 rounded-3xl shadow-2xl text-center hover:shadow-xl transition">
            <div className="flex justify-center mb-4"><BarChart3 size={150} /></div>
            <p className="text-sm sm:text-base font-semibold">Dashboard Screenshot</p>
          </div>
        </div>

        {/* RIGHT FEATURES */}
        <div className="w-full lg:w-1/2 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition">
            <span className="text-[#06B6D4] font-bold text-lg sm:text-xl flex-shrink-0 text-2xl">✔</span>
            <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">Equal & custom split</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition">
            <span className="text-[#06B6D4] font-bold text-lg sm:text-xl flex-shrink-0 text-2xl">✔</span>
            <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">Guest access</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition">
            <span className="text-[#06B6D4] font-bold text-lg sm:text-xl flex-shrink-0 text-2xl">✔</span>
            <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">Secure login</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition">
            <span className="text-[#06B6D4] font-bold text-lg sm:text-xl flex-shrink-0 text-2xl">✔</span>
            <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">Archive completed bills</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition">
            <span className="text-[#06B6D4] font-bold text-lg sm:text-xl flex-shrink-0 text-2xl">✔</span>
            <p className="text-gray-700 text-sm sm:text-base lg:text-lg font-medium">Upgrade to Premium</p>
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section className="w-full px-4 sm:px-8 lg:px-20 py-16 sm:py-20 bg-white">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-[#164E63] mb-8 sm:mb-12 lg:mb-16">
          Simple, Transparent Pricing
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto px-4 sm:px-0">

          {/* STANDARD */}
          <div className="p-6 sm:p-10 rounded-2xl shadow-md bg-gradient-to-br from-[#F0F9FA] to-[#67E8F9] border-2 border-[#06B6D4] text-center hover:shadow-lg transition">
            <h4 className="text-xl sm:text-2xl font-bold text-[#164E63] mb-3 sm:mb-4">
              Starter
            </h4>
            <p className="text-2xl sm:text-3xl font-bold text-[#06B6D4] mb-4 sm:mb-6">Free</p>
            <div className="space-y-2 mb-4 sm:mb-6 text-sm sm:text-base text-gray-700">
              <p>✓ 5 bills/month</p>
              <p>✓ 3 people per bill</p>
              <p>✓ Basic split</p>
            </div>

            <button className="
            w-full mt-6 px-6 py-3 
            bg-[#06B6D4] 
            text-[#164E63] 
            rounded-lg 
            hover:bg-[#0891b2] 
            transition shadow-md 
            text-sm 
            sm:text-base 
            font-medium 
            hover:shadow-lg">
              Start Free
            </button>
          </div>

          {/* PREMIUM */}
          <div className="p-6 sm:p-10 rounded-2xl shadow-lg bg-gradient-to-br from-[#06B6D4] to-[#164E63] border-2 border-[#06B6D4] text-center hover:shadow-2xl transition transform hover:scale-105">
            <div className="inline-block bg-[#67E8F9] text-[#164E63] px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-bold mb-3 sm:mb-4">
              ⭐ POPULAR
            </div>
            <h4 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              Pro
            </h4>
            <p className="text-2xl sm:text-3xl font-bold text-[#67E8F9] mb-4 sm:mb-6">$4.99/mo</p>
            <div className="space-y-2 mb-4 sm:mb-6 text-sm sm:text-base text-white">
              <p>✓ Unlimited bills</p>
              <p>✓ Unlimited people</p>
              <p>✓ Advanced splits</p>
              <p>✓ Priority support</p>
            </div>

            <button className="
            w-full mt-6 px-6 py-3 
            bg-[#67E8F9] text-[#164E63] 
            rounded-lg hover:bg-white 
            transition shadow-md 
            text-sm sm:text-base 
            font-bold 
            hover:shadow-lg">
              Upgrade Now
            </button>
          </div>

        </div>
      </section>

      {/* ================= GUEST ACCESS ================= */}
      <section className="w-full px-4 sm:px-8 lg:px-20 py-16 sm:py-20 text-center bg-gradient-to-r from-[#06B6D4] to-[#164E63]">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
          Don't Have an Account?
        </h3>
        <p className="text-sm sm:text-base text-cyan-100 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
          No problem! Use an invitation code to join a bill as a guest and start splitting instantly.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-2xl mx-auto px-4">
          <input
            type="text"
            placeholder="Enter Invitation Code"
            className="px-4 py-3 rounded-lg border-2 border-[#67E8F9] w-full text-sm sm:text-base focus:outline-none focus:border-white focus:ring-2 focus:ring-[#67E8F9] bg-white"
          />

          <button className="px-6 py-3 bg-[#67E8F9] text-[#164E63] rounded-lg hover:bg-white transition shadow-lg whitespace-nowrap text-sm sm:text-base font-bold hover:shadow-xl border-2 border-[#67E8F9] hover:border-white">
            Access Bill
          </button>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="w-full bg-[#164E63] text-white px-4 sm:px-8 lg:px-20 py-8 sm:py-10 border-t-2 border-[#06B6D4]">
        <div className="flex flex-col sm:flex-row justify-center sm:justify-between gap-4 sm:gap-6 mb-6 text-center sm:text-left text-sm sm:text-base">
          <a href="#" className="text-white hover:text-[#67E8F9] transition font-medium">About</a>
          <a href="#" className="text-white hover:text-[#67E8F9] transition font-medium">Contact</a>
          <a href="#" className="text-white hover:text-[#67E8F9] transition font-medium">Privacy Policy</a>
        </div>

        <div className="pt-6 sm:pt-6 border-t border-[#06B6D4] text-xs sm:text-sm text-center text-cyan-200 flex items-center justify-center gap-1">
          © 2026 BillSplit. All rights reserved. | Made with <Heart size={14} fill="currentColor" />
        </div>
      </footer>

    </div>
  );
}
