import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ParticleBackground from '@/components/ParticleBackground'
import GoldButton from '@/components/GoldButton'
import { useAuth } from '@/context/AuthContext'
import { MailCheck } from 'lucide-react'

const CheckEmail = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true })
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-background">
      <ParticleBackground />
      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Elitez Club" className="h-20 mx-auto mb-4 animate-pulse-slow" />
          <h1 className="font-size-2rem font-bold text-white mb-1rem">Elitez Club Academy</h1>
          <p className="text-muted-foreground">Educational platform for the elite ready for the next level</p>
        </div>
        <div className="glass rounded-lg p-8 border border-white/10 animate-fade-in text-center">
          <MailCheck className="mx-auto mb-4 text-gold" size={40} />
          <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-muted-foreground mb-6">
            We sent a confirmation link to your email. Please click the link to verify
            your account. After confirmation, you can log in to the academy.
          </p>
          <Link to="/login">
            <GoldButton className="w-full text-lg py-6">
              Go to Login
            </GoldButton>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CheckEmail
