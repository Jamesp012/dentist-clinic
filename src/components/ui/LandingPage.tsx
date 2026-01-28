import { motion } from 'motion/react';
import { Stethoscope, Users, Award, Heart, MapPin, Phone, Mail } from 'lucide-react';

type LandingPageProps = {
  onGetStarted: () => void;
};

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="w-full bg-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 relative overflow-hidden pt-20">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-100px)]">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="inline-flex items-center gap-3 mb-4"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🦷</span>
                  </div>
                  <span className="text-teal-600 font-semibold text-lg">DentaCare Pro</span>
                </motion.div>
                <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                  Your Complete Dental Management Solution
                </h1>
                <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                  Streamline your dental clinic operations with our comprehensive management system. From patient scheduling to financial reporting, we've got everything you need.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onGetStarted}
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl text-lg"
                >
                  Get Started Today
                </button>
                <button
                  className="px-8 py-4 bg-white text-teal-600 border-2 border-teal-500 rounded-xl hover:bg-teal-50 transition-all duration-300 font-semibold text-lg"
                >
                  Learn More
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                <div>
                  <p className="text-3xl font-bold text-teal-600">500+</p>
                  <p className="text-slate-600">Active Clinics</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600">50K+</p>
                  <p className="text-slate-600">Happy Patients</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600">24/7</p>
                  <p className="text-slate-600">Support</p>
                </div>
              </div>
            </motion.div>

            {/* Right illustration */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block"
            >
              <div className="bg-gradient-to-br from-teal-400 to-cyan-500 rounded-3xl p-1 shadow-2xl">
                <div className="bg-white rounded-2xl p-8 h-96 flex items-center justify-center">
                  <div className="text-center">
                    <Stethoscope className="w-24 h-24 text-teal-500 mx-auto mb-4" />
                    <p className="text-2xl font-semibold text-slate-800">Modern Dental Management</p>
                    <p className="text-slate-600 mt-2">All-in-one solution for your clinic</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to manage your dental clinic efficiently and professionally
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Users,
                title: 'Patient Management',
                description: 'Complete patient profiles, medical history, and digital records'
              },
              {
                icon: Award,
                title: 'Appointment Scheduling',
                description: 'Smart calendar system with automated reminders and confirmations'
              },
              {
                icon: Heart,
                title: 'Dental Charting',
                description: 'Advanced visual charting system for treatments and procedures'
              },
              {
                icon: Stethoscope,
                title: 'Financial Reporting',
                description: 'Track revenue, expenses, and generate comprehensive reports'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-teal-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Clinic Section */}
      <section className="py-20 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-12 text-center">About Our Clinic</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              <div className="space-y-6">
                <p className="text-lg text-slate-700 leading-relaxed">
                  DentaCare Pro is built on the foundation of modern dental practice management. Our system has been developed by dental professionals and software engineers working together to solve the unique challenges faced by dental clinics.
                </p>
                <p className="text-lg text-slate-700 leading-relaxed">
                  With over a decade of experience in healthcare technology, we understand the importance of security, efficiency, and patient care. Our platform is trusted by clinics worldwide to manage their operations seamlessly.
                </p>
                <p className="text-lg text-slate-700 leading-relaxed">
                  We're committed to continuous innovation and improvement, ensuring that our clients always have access to cutting-edge dental management solutions.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Award className="w-6 h-6 text-teal-600" />
                    HIPAA Compliant
                  </h3>
                  <p className="text-slate-600">We maintain the highest standards of data security and patient privacy compliance</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-teal-600" />
                    Patient-Centered
                  </h3>
                  <p className="text-slate-600">Every feature is designed with patients and healthcare providers in mind</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-teal-600" />
                    24/7 Support
                  </h3>
                  <p className="text-slate-600">Our dedicated support team is always available to help your clinic succeed</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-white p-8 rounded-xl shadow-lg">
              {[
                { label: 'Years in Healthcare', value: '12+' },
                { label: 'Active Clinics', value: '500+' },
                { label: 'Patient Records', value: '2M+' },
                { label: 'Daily Transactions', value: '10K+' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <p className="text-4xl font-bold text-teal-600 mb-2">{stat.value}</p>
                  <p className="text-slate-600">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get In Touch</h2>
            <p className="text-xl text-slate-600">Have questions? We'd love to hear from you</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Phone,
                title: 'Phone',
                value: '+639773651397',
                desc: 'Available 5pm Weekdays and 8am Weekends'
              },
              {
                icon: Mail,
                title: 'Email',
                value: 'support@dentacarepro.com',
                desc: 'We respond within 2 hours'
              },
              {
                icon: MapPin,
                title: 'Address',
                value: '2HGV+4FH, E. Jacinto Street, City of Tayabas, 4327 Quezon Province',
                desc: 'Visit our clinic'
              }
            ].map((contact, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300"
              >
                <contact.icon className="w-12 h-12 text-teal-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{contact.title}</h3>
                <p className="text-slate-700 font-medium mb-1">{contact.value}</p>
                <p className="text-sm text-slate-600">{contact.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Developers Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-xl text-slate-300">Passionate developers and designers behind DentaCare Pro</p>
          </motion.div>

          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-2xl">
            {[
              {
                name: 'Krista Lyn A. Gob',
                role: 'Computer Engineering | Researcher',
                bio: 'Southern Luzon State University - Class of 2026'
              },
              {
                
                name: 'Sarah J. Zarsadias',
                role: 'Computer Engineering | Researcher',
                bio: 'Southern Luzon State University - Class of 2026'
              }
            ].map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-700/50 backdrop-blur p-6 rounded-xl text-center hover:bg-slate-700/70 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                <p className="text-teal-400 text-sm mb-3">{member.role}</p>
                <p className="text-slate-300 text-sm">{member.bio}</p>
              </motion.div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🦷</span>
                <span className="text-white font-bold">DentaCare Pro</span>
              </div>
              <p className="text-sm">Professional dental management system for modern clinics</p>
            </div>

            {[
              {
                title: 'Product',
                links: ['Features', 'Security', 'Pricing', 'FAQ']
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Contact']
              },
              {
                title: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'HIPAA Compliance', 'Sitemap']
              }
            ].map((column, index) => (
              <div key={index}>
                <h4 className="text-white font-semibold mb-4">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#" className="hover:text-teal-400 transition-colors duration-300 text-sm">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-center md:text-left">
                © 2026 DentaCare Pro. All rights reserved. | Developed with ❤️ by our dedicated team
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-sm hover:text-teal-400 transition-colors duration-300">
                  Privacy
                </a>
                <a href="#" className="text-sm hover:text-teal-400 transition-colors duration-300">
                  Terms
                </a>
                <a href="#" className="text-sm hover:text-teal-400 transition-colors duration-300">
                  Cookies
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
