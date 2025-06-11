// src/services/phoneVerification.ts
import { 
    PhoneAuthProvider,
    signInWithCredential,
    getAuth
  } from 'firebase/auth';
  import { auth } from '../config/firebase';
  
  export class PhoneVerificationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PhoneVerificationError';
    }
  }
  
  export interface VerificationResult {
    success: boolean;
    verificationId?: string;
    error?: string;
  }
  
  export class PhoneVerificationService {
    private static instance: PhoneVerificationService;
    private verificationId: string | null = null;
  
    private constructor() {}
  
    static getInstance(): PhoneVerificationService {
      if (!this.instance) {
        this.instance = new PhoneVerificationService();
      }
      return this.instance;
    }
  
    private formatPhoneNumber(phone: string): string {
      // Remove todos os caracteres não numéricos
      const cleaned = phone.replace(/\D/g, '');
      
      // Adiciona o código do país se não existir
      if (!cleaned.startsWith('55')) {
        return `+55${cleaned}`;
      }
      return `+${cleaned}`;
    }
  
    async sendVerificationCode(phoneNumber: string): Promise<VerificationResult> {
      try {
        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        
        // Criar uma nova instância do provedor de autenticação por telefone
        const phoneProvider = new PhoneAuthProvider(auth);
        
        // Solicitar código de verificação
        this.verificationId = await phoneProvider.verifyPhoneNumber(
          formattedPhone,
          // @ts-ignore - O tipo esperado é diferente entre Web e RN
          // mas isso funciona em RN
          90 // recaptchaVerifier é opcional em RN
        );
        
        return {
          success: true,
          verificationId: this.verificationId
        };
      } catch (error: any) {
        console.error('Erro ao enviar código de verificação:', error);
        
        let errorMessage = 'Erro ao enviar código de verificação';
        
        switch (error.code) {
          case 'auth/invalid-phone-number':
            errorMessage = 'Número de telefone inválido';
            break;
          case 'auth/quota-exceeded':
            errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
            break;
          default:
            errorMessage = 'Erro ao enviar o código de verificação';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
    }
  
    async verifyCode(code: string): Promise<VerificationResult> {
      try {
        if (!this.verificationId) {
          throw new PhoneVerificationError('Nenhum código de verificação foi enviado');
        }
  
        // Criar a credencial do telefone
        const credential = PhoneAuthProvider.credential(
          this.verificationId,
          code
        );
  
        // Fazer sign in com a credencial
        await signInWithCredential(auth, credential);
  
        // Se chegou aqui, a verificação foi bem sucedida
        return {
          success: true
        };
      } catch (error: any) {
        console.error('Erro ao verificar código:', error);
        
        let errorMessage = 'Código de verificação inválido';
        
        switch (error.code) {
          case 'auth/invalid-verification-code':
            errorMessage = 'Código incorreto';
            break;
          case 'auth/code-expired':
            errorMessage = 'Código expirado';
            break;
          default:
            errorMessage = 'Erro ao verificar o código';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
    }
  
    clearVerification() {
      this.verificationId = null;
    }
  }
  
  export const phoneVerificationService = PhoneVerificationService.getInstance();