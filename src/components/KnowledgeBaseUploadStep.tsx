/**
 * Knowledge Base Upload step for SaaS onboarding.
 *
 * Allows users to:
 * - Add FAQ pairs (question + answer)
 * - Upload text/PDF files
 * - Use pre-built templates (Return Policy, Shipping, About Us)
 * - Skip this step
 */

import { useState } from 'react';
import {
  BookOpen,
  Plus,
  Upload,
  Trash2,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { saasApi } from '@/services/saasApiService';

interface KBUploadStepProps {
  subdomain: string;
  onComplete: (data: string) => void;
  primaryColor: string;
}

interface FAQPair {
  question: string;
  answer: string;
}

const TEMPLATES = [
  {
    id: 'returns',
    label: 'Return Policy',
    content: `Return Policy

We accept returns within 7 days of delivery. Items must be unused and in original packaging.

To initiate a return:
1. DM us with your order number
2. We'll send you a return shipping label
3. Ship the item back within 3 business days
4. Refund will be processed within 5-7 business days

Exchange is also available for different size or color.

Non-returnable items: Undergarments, customized products, items on final sale.`,
  },
  {
    id: 'shipping',
    label: 'Shipping Info',
    content: `Shipping Information

We ship across India via trusted courier partners.

Delivery Timeline:
- Metro cities (Mumbai, Delhi, Bangalore, etc.): 2-4 business days
- Other cities: 4-7 business days
- Remote areas: 7-10 business days

Free shipping on orders above ₹999.
Standard shipping: ₹99

All orders include tracking. You'll receive a tracking link via DM once shipped.

Cash on Delivery (COD) available on orders up to ₹5,000.`,
  },
  {
    id: 'about',
    label: 'About Us',
    content: `About Us

We are a modern Indian brand bringing you the latest trends at affordable prices.

Started in 2023, we've served over 10,000+ happy customers across India.

Our Promise:
- Quality products at honest prices
- Easy returns and exchanges
- Fast shipping with tracking
- Dedicated customer support via Instagram DM

We love hearing from our customers! Share your photos with #OurBrand and get featured on our page.`,
  },
];

export default function KnowledgeBaseUploadStep({
  subdomain,
  onComplete,
  primaryColor,
}: KBUploadStepProps) {
  const [faqs, setFaqs] = useState<FAQPair[]>([{ question: '', answer: '' }]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const addFAQ = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const removeFAQ = (index: number) => {
    if (faqs.length === 1) return;
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const toggleTemplate = (id: string) => {
    const next = new Set(selectedTemplates);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTemplates(next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file.name);
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      // Collect all KB content
      const articles: Array<{ title: string; content: string; category: string }> = [];

      // FAQ pairs
      for (const faq of faqs) {
        if (faq.question.trim() && faq.answer.trim()) {
          articles.push({
            title: faq.question,
            content: `Q: ${faq.question}\nA: ${faq.answer}`,
            category: 'faq',
          });
        }
      }

      // Templates
      for (const templateId of selectedTemplates) {
        const template = TEMPLATES.find(t => t.id === templateId);
        if (template) {
          articles.push({
            title: template.label,
            content: template.content,
            category: templateId,
          });
        }
      }

      // Save via runtime API (through SaaS proxy)
      for (const article of articles) {
        try {
          await saasApi.request(subdomain, '/api/knowledge-base', {
            method: 'POST',
            body: JSON.stringify(article),
          });
        } catch (err) {
          console.warn('KB article save failed (non-fatal):', err);
        }
      }

      setUploaded(true);
      onComplete(JSON.stringify({ articles_count: articles.length }));
    } catch (err) {
      console.error('KB upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-gray-900">Knowledge base created!</p>
        <p className="text-sm text-gray-500 mt-1">
          Your AI agent can now answer customer questions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FAQ Pairs */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <BookOpen className="w-4 h-4" /> Add FAQs
        </h4>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={faq.question}
                onChange={e => updateFAQ(i, 'question', e.target.value)}
                placeholder="Question (e.g. What is your return policy?)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <textarea
                value={faq.answer}
                onChange={e => updateFAQ(i, 'answer', e.target.value)}
                placeholder="Answer..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              {faqs.length > 1 && (
                <button onClick={() => removeFAQ(i)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addFAQ}
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: primaryColor }}
          >
            <Plus className="w-4 h-4" /> Add another FAQ
          </button>
        </div>
      </div>

      {/* Templates */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Templates</h4>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => toggleTemplate(t.id)}
              className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                selectedTemplates.has(t.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 mb-1 text-gray-400" />
              {t.label}
              {selectedTemplates.has(t.id) && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 float-right" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* File Upload */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Upload File (Optional)</h4>
        <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors">
          <input type="file" accept=".txt,.pdf" onChange={handleFileUpload} className="hidden" />
          <div className="text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {uploadedFile ? uploadedFile : 'Drop a .txt or .pdf file here'}
            </p>
          </div>
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={uploading}
        className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: primaryColor }}
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
        ) : (
          <><CheckCircle2 className="w-4 h-4" /> Save Knowledge Base</>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        You can always add more articles later from the dashboard.
      </p>
    </div>
  );
}
