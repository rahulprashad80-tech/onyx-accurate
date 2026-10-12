import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AppUser } from '../../types';
import {
  Shield,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  KeyRound,
  UserPlus,
  Building,
  Layers,
  ArrowLeft,
  Clock,
} from 'lucide-react';

interface SignInViewProps {
  onMustChangePassword: (user: AppUser) => void;
  onOpenFirstAdminSetup?: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({
  onMustChangePassword,
  onOpenFirstAdminSetup,
}) => {
  const { login, registerEmployee, hasAnyUsers } = useAuth();
  const { companies, departments } = useData();

  // Mode: login or register
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login states
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Self-registration states (Strictly Employee role only)
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCompanyId, setRegCompanyId] = useState('');
  const [regDepartmentId, setRegDepartmentId] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Filter departments by chosen company
  const availableDepts = departments.filter((d) => !regCompanyId || d.companyId === regCompanyId);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!usernameOrEmail.trim()) {
      setErrorMsg('Please enter your username or registered email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(usernameOrEmail, password);

      if (!res.success) {
        setErrorMsg(res.error || 'Invalid credentials. Please verify your username and password.');
        return;
      }

      if (res.mustChangePassword && res.user) {
        onMustChangePassword(res.user);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim()) {
      setErrorMsg('Full name, username, and email are required.');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selCo = companies.find((c) => c.id === regCompanyId);
      const selDept = departments.find((d) => d.id === regDepartmentId);

      const res = await registerEmployee({
        fullName: regFullName.trim(),
        username: regUsername.trim().toLowerCase(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        companyId: regCompanyId || undefined,
        companyName: selCo?.name,
        departmentId: regDepartmentId || undefined,
        departmentName: selDept?.name,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed. Please try again.');
        return;
      }

      setRegSuccessMessage(
        res.message ||
          'Your employee registration has been submitted successfully! Your account is pending IT Administrator approval before you can sign in.'
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setErrorMsg(null);
    setRegSuccessMessage(null);
    setPassword('');
    setRegPassword('');
    setRegConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-6 sm:p-8 pb-4 text-center border-b border-slate-100 bg-slate-50/50">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-600/20">
            {authMode === 'login' ? <Shield className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {authMode === 'login' ? 'IT Helpdesk & Asset Inventory' : 'Employee Self-Registration'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {authMode === 'login'
              ? 'Enterprise Management & Hardware Lifecycle Portal'
              : 'Register for staff IT support and hardware asset assignments'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 pt-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username or Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username or Email Address
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Enter your registered username or email"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In to IT Portal</span>
                  </>
                )}
              </button>

              {/* Toggle to Employee Registration */}
              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Don't have an employee account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      resetForms();
                      setAuthMode('register');
                    }}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                  >
                    Register as Employee
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* EMPLOYEE SELF-REGISTRATION FORM */}
          {authMode === 'register' && (
            <div>
              {regSuccessMessage ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="font-bold text-sm text-emerald-950">Registration Submitted</p>
                      <p className="leading-relaxed text-emerald-800">{regSuccessMessage}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>An IT Administrator will review and approve your account. Once approved, you can log in with your credentials.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetForms();
                      setAuthMode('login');
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Role Notice (Strictly Employee - Non-editable badge, NO dropdown) */}
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="text-slate-600">Assigned Access Role:</span>
                      <span className="ml-1.5 font-bold text-indigo-700 uppercase tracking-wide">
                        Employee
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                      Standard Staff Access
                    </span>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Username & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. ajohnson"
                        autoComplete="username"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Work Email *
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@company.com"
                          autoComplete="email"
                          className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company & Department Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Company / Entity
                      </label>
                      <div className="relative">
                        <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={regCompanyId}
                          onChange={(e) => {
                            setRegCompanyId(e.target.value);
                            setRegDepartmentId('');
                          }}
                          className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors text-slate-700"
                        >
                          <option value="">Select Company...</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department
                      </label>
                      <div className="relative">
                        <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={regDepartmentId}
                          onChange={(e) => setRegDepartmentId(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors text-slate-700"
                        >
                          <option value="">Select Department...</option>
                          {availableDepts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password (min 8 chars) *
                      </label>
                      <div className="relative">
                        <input
                          type={regShowPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors font-mono"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Confirm Password *
                        </label>
                        <button
                          type="button"
                          onClick={() => setRegShowPassword(!regShowPassword)}
                          className="text-[10px] text-slate-400 hover:text-slate-600"
                        >
                          {regShowPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors font-mono"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  {/* Submit Registration */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-3 py-2.5 px-4 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Registration...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Employee Account</span>
                      </>
                    )}
                  </button>

                  {/* Back to Login link */}
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        resetForms();
                        setAuthMode('login');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Already have an account? Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {!hasAnyUsers && onOpenFirstAdminSetup && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onOpenFirstAdminSetup}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
              >
                Create First Admin Account Setup &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Forgot Your Password?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Public self-service password reset is disabled for enterprise security. Please contact an active IT Administrator to issue a temporary password or reset credentials.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1">
              <p>• <strong>Sameer Tupe</strong> (sameertupe@acculate.internal)</p>
              <p>• <strong>Rahul Prasad</strong> (rahulprashad80@gmail.com)</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Administrators can reset user passwords with mandatory change on next login from the User Management module.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
