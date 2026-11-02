import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  User, 
  Check, 
  Stethoscope, 
  Award, 
  FileSpreadsheet, 
  Building2, 
  LogIn, 
  LogOut, 
  Loader2, 
  Sparkles,
  Lock,
  ChevronRight,
  Shield,
  Activity,
  Heart
} from 'lucide-react';
import { UserProfile, UserRole, DEMO_USERS, ROLE_DEFINITIONS } from '../types/auth';
import { EstablishmentConfig } from '../types/dnt';
import { signInWithGoogle, switchClinicalRole, signOutUser } from '../services/authService';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  establishment: EstablishmentConfig;
  onUserChange: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  establishment,
  onUserChange,
}) => {
  if (!isOpen) return null;

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [customName, setCustomName] = useState(currentUser.displayName);
  const [customColegiatura, setCustomColegiatura] = useState(currentUser.colegiatura || '');
  const [successMsg, setSuccessMsg] = useState('');

  const currentRoleDef = ROLE_DEFINITIONS[currentUser.role];

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    try {
      const user = await signInWithGoogle(establishment);
      onUserChange(user);
      setSuccessMsg('¡Sesión iniciada con éxito!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      console.warn('Google sign in canceled or error:', err);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleRoleSwitch = async (role: UserRole) => {
    setSelectedRole(role);
    const demo = DEMO_USERS.find((u) => u.role === role);
    const updated = await switchClinicalRole(
      role, 
      establishment, 
      customName || demo?.displayName,
      customColegiatura || demo?.colegiatura
    );
    onUserChange(updated);
    setSuccessMsg(`Rol actualizado a: ${ROLE_DEFINITIONS[role].label}`);
    setTimeout(() => {
      setSuccessMsg('');
    }, 2000);
  };

  const handleSaveCustomProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await switchClinicalRole(
      selectedRole,
      establishment,
      customName.trim() || currentUser.displayName,
      customColegiatura.trim() || undefined
    );
    onUserChange(updated);
    setSuccessMsg('Perfil clínico actualizado.');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1000);
  };

  const handleSignOut = async () => {
    await signOutUser();
    onUserChange(DEMO_USERS[0]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Autenticación y Control de Roles (RBAC)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Gestión de identidad clínica, permisos de acceso y trazabilidad en el padrón
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tarjeta de Usuario Activo */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {currentUser.displayName}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentRoleDef.badgeBg} ${currentRoleDef.badgeText} ${currentRoleDef.badgeBorder}`}>
                    {currentRoleDef.shortLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {currentUser.roleTitle} {currentUser.colegiatura ? `· ${currentUser.colegiatura}` : ''}
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-slate-500 hover:text-red-700 px-2.5 py-1.5 rounded-md hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>

          {/* Opción 1: Inicio de sesión con Google (Cuenta Institucional / Personal) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Inicio de Sesión Oficial
            </label>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoadingGoogle}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              {isLoadingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>{isLoadingGoogle ? 'Conectando con Google...' : 'Acceder con Google (Cuenta de Salud / Personal)'}</span>
            </button>
          </div>

          {/* Opción 2: Selector Rápido de Roles Clínicos (Ideal para pruebas y cambio de puesto) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Cambio Rápido de Puesto Clínico (RBAC)
              </label>
              <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Multi-rol activo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(['medico', 'enfermero', 'digitador', 'admin'] as UserRole[]).map((role) => {
                const def = ROLE_DEFINITIONS[role];
                const isCurrent = currentUser.role === role;
                const demo = DEMO_USERS.find((u) => u.role === role);

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSwitch(role)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isCurrent 
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-600' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${def.badgeBg} ${def.badgeText} ${def.badgeBorder}`}>
                          {def.shortLabel}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-teal-700 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Activo
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">
                        {def.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                        {def.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 flex items-center justify-between">
                      <span className="font-mono">{demo?.displayName.split(' ')[0]} {demo?.displayName.split(' ')[1]}</span>
                      <span>Cambiar puesto →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulario de personalización de credenciales */}
          <form onSubmit={handleSaveCustomProfile} className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800">
              Personalizar Datos del Operador Clínico Actual
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Nombre Completo del Profesional / Digitador:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ej: Dr. Juan Pérez Soto"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  N° de Colegiatura (CMP / CEP) o Cargo:
                </label>
                <input
                  type="text"
                  value={customColegiatura}
                  onChange={(e) => setCustomColegiatura(e.target.value)}
                  placeholder="Ej: CMP 58210 · RNE 23901"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Datos del Profesional</span>
              </button>
            </div>
          </form>

          {/* Matriz de Permisos del Rol Seleccionado */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
            <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
              Permisos del Rol Activo ({currentRoleDef.shortLabel}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                {currentRoleDef.permissions.canRegisterPatients ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={currentRoleDef.permissions.canRegisterPatients ? 'text-slate-800' : 'text-slate-400'}>
                  Filiar y registrar nuevos pacientes
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {currentRoleDef.permissions.canRecordClinicalControls ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={currentRoleDef.permissions.canRecordClinicalControls ? 'text-slate-800' : 'text-slate-400'}>
                  Registrar controles mensuales y funciones vitales
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {currentRoleDef.permissions.canEditMedicalNotes ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={currentRoleDef.permissions.canEditMedicalNotes ? 'text-slate-800' : 'text-slate-400'}>
                  Modificar notas médicas y prescripción
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {currentRoleDef.permissions.canDeletePatients ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={currentRoleDef.permissions.canDeletePatients ? 'text-slate-800' : 'text-slate-400'}>
                  Eliminar registros del padrón
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {currentRoleDef.permissions.canChangeThresholds ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={currentRoleDef.permissions.canChangeThresholds ? 'text-slate-800' : 'text-slate-400'}>
                  Ajustar umbrales clínicos y metas sanitarias
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {currentRoleDef.permissions.canManageBackups ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={currentRoleDef.permissions.canManageBackups ? 'text-slate-800' : 'text-slate-400'}>
                  Gestionar copias de seguridad automáticas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
