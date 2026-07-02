'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Award,
  ExternalLink,
  Calendar,
  Edit2,
  X,
  Building,
  Eye,
} from 'lucide-react';
import {
  ProfileSection,
  RevealItem,
  SectionAddButton,
  SectionEmptyState,
} from './ProfileSection';
import type { Certificate } from '@/types/profile';

interface CertificatesGridProps {
  certificates: Certificate[];
  isOwner: boolean;
  onAddCertificate?: () => void;
  onEditCertificate?: (certificate: Certificate) => void;
}

export function CertificatesGrid({
  certificates,
  isOwner,
  onAddCertificate,
  onEditCertificate,
}: CertificatesGridProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  if (certificates.length === 0 && !isOwner) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isExpired = (cert: Certificate) => {
    if (cert.doesNotExpire || !cert.expiryDate) return false;
    return new Date(cert.expiryDate) < new Date();
  };

  // Check if URL is an image
  const isImageUrl = (url: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext)) ||
      lowercaseUrl.includes('/certificates/') ||
      lowercaseUrl.includes('storage.bunnycdn.com');
  };

  return (
    <ProfileSection
      icon={<Award className="w-5 h-5" />}
      title="Licenses & Certifications"
      count={certificates.length}
      action={
        isOwner && onAddCertificate ? (
          <SectionAddButton onClick={onAddCertificate} label="Add Certificate" />
        ) : undefined
      }
    >
      {certificates.length === 0 ? (
        <SectionEmptyState
          icon={<Award className="w-5 h-5" />}
          message="No certifications added yet."
          actionLabel={isOwner && onAddCertificate ? 'Add Your First Certification' : undefined}
          onAction={isOwner && onAddCertificate ? onAddCertificate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certificates.map((cert, index) => (
            <RevealItem key={cert.id} index={index}>
              <div className="group relative h-full rounded-2xl bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 p-5 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-lg hover:shadow-neutral-900/5 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: cert.color || '#2563eb' }}
                  >
                    <Award className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0 pr-14">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate mb-0.5">
                      {cert.name}
                    </h4>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">
                      {cert.issuingOrg}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(cert.issueDate)}
                      </div>
                      {isExpired(cert) ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-[11px] font-semibold text-red-600 dark:text-red-400">Expired</span>
                      ) : cert.doesNotExpire ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">No Expiration</span>
                      ) : cert.expiryDate && (
                        <span>Expires {formatDate(cert.expiryDate)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-1">
                  {cert.credentialUrl && (
                    <button
                      onClick={() => setSelectedCertificate(cert)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                      title="View certificate"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isOwner && onEditCertificate && (
                    <button
                      onClick={() => onEditCertificate(cert)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                      title="Edit certificate"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </RevealItem>
          ))}
        </div>
      )}

      {/* Certificate View Modal */}
      <Dialog.Root open={!!selectedCertificate} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
        <AnimatePresence>
          {selectedCertificate && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 transition-opacity"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 12 }}
                  transition={{ duration: 0.2 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl z-50 border border-neutral-200 dark:border-neutral-800"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: selectedCertificate.color || '#2563eb' }}
                      >
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      Certificate Details
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Certificate Image */}
                    {selectedCertificate.credentialUrl && isImageUrl(selectedCertificate.credentialUrl) ? (
                      <div className="mb-6 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 p-2">
                        <img
                          src={selectedCertificate.credentialUrl}
                          alt={`${selectedCertificate.name} certificate`}
                          className="w-full h-auto object-contain max-h-[50vh] rounded-lg"
                        />
                      </div>
                    ) : selectedCertificate.credentialUrl && (
                      <div className="mb-6 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800">
                        <a
                          href={selectedCertificate.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Certificate Link
                        </a>
                      </div>
                    )}

                    {/* Certificate Details */}
                    <div>
                      <h3 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">
                        {selectedCertificate.name}
                      </h3>

                      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-6">
                        <Building className="w-4 h-4" />
                        <span className="text-sm font-medium">{selectedCertificate.issuingOrg}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-1">Issue Date</div>
                          <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {formatFullDate(selectedCertificate.issueDate)}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-1">Expiry Date</div>
                          <div className={`text-sm font-semibold ${isExpired(selectedCertificate) ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                            {selectedCertificate.doesNotExpire ? 'No Expiration' : selectedCertificate.expiryDate ? formatFullDate(selectedCertificate.expiryDate) : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {selectedCertificate.credentialId && (
                        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Credential ID</span>
                          <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">{selectedCertificate.credentialId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </ProfileSection>
  );
}
