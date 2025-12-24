import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import GoldButton from '@/components/GoldButton'
import ParticleBackground from '@/components/ParticleBackground'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, UserPlus, User } from 'lucide-react'

const Signup = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { signUp, user } = useAuth()

  useEffect(() => {
    document.body.classList.remove('success-login')
  }, [])

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || !confirmPassword) {
      toast({
        title: 'Invalid Input',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }
    if (password !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Password and confirm password do not match',
        variant: 'destructive',
      })
      return
    }
    try {
      setLoading(true)
      
      // Use AuthContext signUp to handle profile creation with defaults
      await signUp(email, password, {
        name,
        bio: 'Entrepreneur, Investor, Future Billionaire',
        profilePic: '', // Will be stored as empty string or mapped to null if DB layer handles it, logic says null requested but empty string matches interface
        membershipType: 'Free Trial',
        subscriptionDate: new Date().toISOString(),
        renewIntervalDays: 1
      })

      toast({
        title: 'Account Created',
        description: 'Account created successfully. Please check your email to confirm your account.',
      })
      navigate('/check-email', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account'
      toast({
        title: 'Signup Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-background">
      <ParticleBackground />
      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Elitez Club" className="h-20 mx-auto mb-4 animate-pulse-slow" />
          <h1 className="font-size-2rem font-bold text-white mb-1rem">Elitez Club Academy</h1>
          <p className="text-muted-foreground">Educational platform for the elite ready for the next level</p>
        </div>
        <div className="glass rounded-lg p-8 border border-white/10 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-white/10 bg-black/40 focus:border-gold text-white text-left pl-10"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-black/40 focus:border-gold text-white text-left pl-2"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-gold transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-white/10 bg-black/40 focus:border-gold text-white text-left pl-2"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-gold transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="pt-2">
              <GoldButton type="submit" className="w-full text-lg py-6" loading={loading}>
                <UserPlus className="mr-2" />
                Create Your Account
              </GoldButton>
            </div>
            <Link to="/login" className='mt-1rem block'>
            <p className="text-center text-gold">Already have an account? Log in</p>
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Signup
