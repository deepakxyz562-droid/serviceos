/**
 * AI Translation (heuristic dictionary)
 * -------------------------------------
 * Translates field labels, placeholders, and help text to a target language.
 * Uses a small built-in dictionary for common form phrases; unknown phrases
 * are passed through unchanged with a TODO marker so the LLM integration can
 * fill them in later.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for arbitrary text translation.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

export type SupportedLang = 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl' | 'ar' | 'ja' | 'zh' | 'ko' | 'ru' | 'hi';

const DICTIONARIES: Record<SupportedLang, Record<string, string>> = {
  es: { 'full name': 'Nombre completo', 'email address': 'Correo electrónico', 'phone number': 'Número de teléfono', 'message': 'Mensaje', 'submit': 'Enviar', 'additional notes': 'Notas adicionales', 'address': 'Dirección', 'company': 'Empresa' },
  fr: { 'full name': 'Nom complet', 'email address': 'Adresse e-mail', 'phone number': 'Numéro de téléphone', 'message': 'Message', 'submit': 'Envoyer', 'additional notes': 'Notes supplémentaires', 'address': 'Adresse', 'company': 'Société' },
  de: { 'full name': 'Vollständiger Name', 'email address': 'E-Mail-Adresse', 'phone number': 'Telefonnummer', 'message': 'Nachricht', 'submit': 'Absenden', 'additional notes': 'Zusätzliche Hinweise', 'address': 'Adresse', 'company': 'Firma' },
  it: { 'full name': 'Nome completo', 'email address': 'Indirizzo email', 'phone number': 'Numero di telefono', 'message': 'Messaggio', 'submit': 'Invia', 'additional notes': 'Note aggiuntive', 'address': 'Indirizzo', 'company': 'Azienda' },
  pt: { 'full name': 'Nome completo', 'email address': 'Endereço de e-mail', 'phone number': 'Número de telefone', 'message': 'Mensagem', 'submit': 'Enviar', 'additional notes': 'Notas adicionais', 'address': 'Endereço', 'company': 'Empresa' },
  nl: { 'full name': 'Volledige naam', 'email address': 'E-mailadres', 'phone number': 'Telefoonnummer', 'message': 'Bericht', 'submit': 'Verzenden', 'additional notes': 'Aanvullende opmerkingen', 'address': 'Adres', 'company': 'Bedrijf' },
  ar: { 'full name': 'الاسم الكامل', 'email address': 'البريد الإلكتروني', 'phone number': 'رقم الهاتف', 'message': 'رسالة', 'submit': 'إرسال', 'additional notes': 'ملاحظات إضافية', 'address': 'العنوان', 'company': 'الشركة' },
  ja: { 'full name': '氏名', 'email address': 'メールアドレス', 'phone number': '電話番号', 'message': 'メッセージ', 'submit': '送信', 'additional notes': '追加メモ', 'address': '住所', 'company': '会社名' },
  zh: { 'full name': '姓名', 'email address': '电子邮箱', 'phone number': '电话号码', 'message': '留言', 'submit': '提交', 'additional notes': '附加备注', 'address': '地址', 'company': '公司' },
  ko: { 'full name': '전체 이름', 'email address': '이메일 주소', 'phone number': '전화번호', 'message': '메시지', 'submit': '제출', 'additional notes': '추가 메모', 'address': '주소', 'company': '회사' },
  ru: { 'full name': 'Полное имя', 'email address': 'Адрес электронной почты', 'phone number': 'Номер телефона', 'message': 'Сообщение', 'submit': 'Отправить', 'additional notes': 'Дополнительные заметки', 'address': 'Адрес', 'company': 'Компания' },
  hi: { 'full name': 'पूरा नाम', 'email address': 'ईमेल पता', 'phone number': 'फ़ोन नंबर', 'message': 'संदेश', 'submit': 'जमा करें', 'additional notes': 'अतिरिक्त नोट्स', 'address': 'पता', 'company': 'कंपनी' },
};

function translateString(text: string | undefined, dict: Record<string, string>): string | undefined {
  if (!text) return text;
  const lower = text.toLowerCase();
  for (const [src, dst] of Object.entries(dict)) {
    if (lower === src) return dst;
    if (lower.includes(src)) {
      return text.replace(new RegExp(escapeRegex(src), 'gi'), dst);
    }
  }
  // Unknown: pass through unchanged (LLM would fill in here)
  return text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function translateFormFields(fields: FormField[], targetLang: string): Promise<FormField[]> {
  const dict = DICTIONARIES[targetLang as SupportedLang];
  if (!dict) return fields; // unsupported lang — leave unchanged

  return fields.map((f) => ({
    ...f,
    label: translateString(f.label, dict) ?? f.label,
    placeholder: translateString(f.placeholder, dict),
    helpText: translateString(f.helpText, dict),
    description: translateString(f.description, dict),
    options: f.options?.map((o) => ({ ...o, label: translateString(o.label, dict) ?? o.label })),
  }));
}

export { translateFormFields as default };
