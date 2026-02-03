import React, { useEffect, useState } from 'react';
import { GoogleSheetsService } from '../../services/GoogleSheetsService';
import { Loader2, AlertTriangle, LogIn } from 'lucide-react';

export const StartupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<'loading' | 'unauthenticated' | 'validating' | 'invalid_sheet' | 'ready'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const service = GoogleSheetsService.getInstance();
        console.log("Initializing with Client ID ending in:", import.meta.env.VITE_GOOGLE_CLIENT_ID?.slice(-10));

        const validate = async () => {
            setStatus('validating');
            const isValid = await service.validateSheetStructure();
            if (isValid) {
                setStatus('ready');
            } else {
                setStatus('invalid_sheet');
                setErrorMsg("A planilha precisa ser atualizada para suportar capas de filmes.");
            }
        };



        const init = async () => {
            try {
                // [NEW] Check for Guest Mode in URL
                const params = new URLSearchParams(window.location.search);
                const isGuest = params.get('guest') === 'true';

                if (isGuest) {
                    console.log("Entering Guest Mode...");
                    service.enableGuestMode();
                    await service.initClient();
                    // In Guest Mode, we try to validate immediately (public read)
                    try {
                        await validate();
                    } catch (err: any) {
                        // If validation fails in guest mode, it's likely permissions
                        console.error("Guest Mode Validation Error", err);
                        setStatus('invalid_sheet');
                        if (err.result?.error?.code === 403) {
                            setErrorMsg("🔒 Esta coleção é Privada. O dono precisa deixá-la 'Pública para Leitura' no Google Drive para que o link funcione.");
                        } else {
                            setErrorMsg("Erro ao acessar coleção pública: " + (err.result?.error?.message || err.message));
                        }
                    }
                    return;
                }

                await service.initClient();

                // Now safe to attach listener
                service.onAuthStateChanged((isSignedIn) => {
                    if (isSignedIn) validate();
                    else setStatus('unauthenticated');
                });

                if (!service.isSignedIn) {
                    setStatus('unauthenticated');
                } else {
                    validate();
                }
            } catch (e) {
                console.error(e);
                setStatus('invalid_sheet'); // Fallback for init errors
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
        }
    };



    const handleUpgrade = async () => {
        try {
            setStatus('validating');
            const service = GoogleSheetsService.getInstance();
            await service.upgradeSheetStructure();
            alert("Estrutura atualizada com sucesso! Recarregando...");
            window.location.reload();
        } catch (e: any) {
            console.error("Upgrade failed:", e);
            setStatus('invalid_sheet');
            setErrorMsg("Falha ao atualizar: " + (e.message || "Erro desconhecido"));
            alert("Erro ao atualizar: " + (e.message || "Verifique o console"));
        }
    };

    if (status === 'ready') return <>{children}</>;

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
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
        </div>
    );
};
