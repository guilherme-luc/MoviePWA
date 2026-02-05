import React, { useEffect, useState } from 'react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { Loader2, AlertTriangle, LogIn } from 'lucide-react';
import { MigrationModal } from '../modals/MigrationModal';

export const StartupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<'loading' | 'unauthenticated' | 'validating' | 'invalid_sheet' | 'ready'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [showMigration, setShowMigration] = useState(false);

    useEffect(() => {
        const service = GoogleSheetsService.getInstance();
        console.log("Initializing with Client ID ending in:", import.meta.env.VITE_GOOGLE_CLIENT_ID?.slice(-10));

        const validate = async () => {
            setStatus('validating');
            try {
                // 1. Structure Check
                const [dvdValid, vhsValid] = await Promise.all([
                    service.validateSheetStructure('DVD'),
                    service.validateSheetStructure('VHS')
                ]);

                if (!dvdValid || !vhsValid) {
                    setStatus('invalid_sheet');
                    setErrorMsg("A planilha precisa ser atualizada para suportar capas de filmes.");
                    return;
                }

                // 2. Migration Check
                // We do this BEFORE showing the app to ensure data is clean
                const legacyMovies = await service.findLegacyVHSMovies();
                console.log(`Validation complete. Found ${legacyMovies.length} legacy VHS movies to migrate.`);

                if (legacyMovies.length > 0) {
                    setShowMigration(true);
                    // We don't set 'ready' yet. MigrationModal will handle the flow.
                } else {
                    setStatus('ready');
                }

            } catch (e: any) {
                console.error("Validation error:", e);
                if (service.isSignedIn) {
                    setStatus('invalid_sheet');
                    setErrorMsg("Erro na validação: " + (e.message || "Verifique permissões"));
                } else {
                    setStatus('unauthenticated');
                }
            }
        };

        const init = async () => {
            try {
                service.onAuthStateChanged((isSignedIn) => {
                    if (isSignedIn) {
                        validate();
                    } else {
                        setStatus('unauthenticated');
                        setShowMigration(false);
                    }
                });

                await service.initClient();
                if (!service.isSignedIn) {
                    setStatus('unauthenticated');
                }
            } catch (e) {
                console.error(e);
                setStatus('invalid_sheet');
                setErrorMsg("Falha ao inicializar API do Google. Verifique sua conexão.");
            }
        };

        init();
    }, []);

    const handleLogin = async () => {
        try {
            await GoogleSheetsService.getInstance().signIn();
        } catch (e) {
            console.error("Login failed", e);
            alert("Falha no login. Verifique o console.");
        }
    };

    const handleUpgrade = async () => {
        try {
            setStatus('validating');
            const service = GoogleSheetsService.getInstance();
            await service.upgradeSheetStructure('DVD');
            await service.upgradeSheetStructure('VHS');

            alert("Estrutura atualizada com sucesso!");
            window.location.reload();
        } catch (e: any) {
            console.error("Upgrade failed:", e);
            setStatus('invalid_sheet');
            setErrorMsg("Falha ao atualizar: " + (e.message || "Erro desconhecido"));
        }
    };

    const onMigrationComplete = () => {
        setShowMigration(false);
        setStatus('ready');
    };

    if (status === 'ready') return <>{children}</>;

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
            <MigrationModal isOpen={showMigration} onComplete={onMigrationComplete} />

            {!showMigration && (
                <div className="max-w-md w-full bg-neutral-800 p-8 rounded-2xl shadow-2xl border border-white/10 text-center">

                    {/* Loading State */}
                    {(status === 'loading' || status === 'validating') && (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                            <h2 className="text-xl font-semibold text-white">
                                {status === 'loading' ? 'Conectando ao Google...' : 'Verificando Coleção...'}
                            </h2>
                            <p className="text-neutral-400 mt-2">Aguarde enquanto preparamos tudo.</p>
                        </div>
                    )}

                    {/* Unauthenticated State */}
                    {status === 'unauthenticated' && (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mb-6">
                                <LogIn className="w-8 h-8 text-primary-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo(a)</h2>
                            <p className="text-neutral-400 mb-8">Faça login com sua conta Google para acessar sua coleção de filmes.</p>
                            <button
                                onClick={handleLogin}
                                className="w-full bg-white text-neutral-900 font-bold py-3 px-6 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                                Entrar com Google
                            </button>
                        </div>
                    )}

                    {/* Invalid Sheet State */}
                    {status === 'invalid_sheet' && (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Erro na Base de Dados</h2>
                            <p className="text-neutral-400 mb-6 text-sm">{errorMsg}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-primary-400 hover:text-primary-300 font-medium"
                            >
                                Tentar Novamente
                            </button>

                            <button
                                onClick={handleUpgrade}
                                className="mt-4 bg-primary-600 hover:bg-primary-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Atualizar Estrutura (Migrar)
                            </button>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};
