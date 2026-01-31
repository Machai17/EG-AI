
import { UserProfile } from "../types";

/**
 * Interface para a base de dados global simulada.
 * Mapeia números de telefone para dados específicos do usuário.
 */
interface GlobalDatabase {
  [phone: string]: {
    profile: UserProfile;
    sessions: any[];
    settings: {
      level: string;
      lang: string;
    };
    lastSync: number;
  };
}

const DB_KEY = 'ENFERMAFIT_CENTRAL_DB';

export const storageService = {
  /**
   * Obtém a base de dados completa.
   */
  getDB(): GlobalDatabase {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : {};
  },

  /**
   * Salva a base de dados completa.
   */
  saveDB(db: GlobalDatabase) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  },

  /**
   * Recupera os dados de um usuário específico pelo telefone.
   */
  getUserData(phone: string) {
    const db = this.getDB();
    return db[phone] || null;
  },

  /**
   * Sincroniza (Salva ou Atualiza) os dados de um usuário.
   */
  syncUser(phone: string, profile: UserProfile, sessions: any[], settings: any) {
    const db = this.getDB();
    db[phone] = {
      profile,
      sessions,
      settings,
      lastSync: Date.now()
    };
    this.saveDB(db);
  },

  /**
   * Limpa a sessão local mas mantém os dados na "nuvem" (DB Central).
   */
  clearLocal() {
    localStorage.removeItem('active_user_phone');
    localStorage.removeItem('active_sid');
  }
};
