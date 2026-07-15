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
  SectionEditButton,
  SectionEmptyState,
} from './ProfileSection';
import { ProfileEntryLogo } from './ProfileEntryLogo';
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
  const [editing, setEditing] = useState(false);

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
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif', '.heic', '.heif'];
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext)) ||
      lowercaseUrl.includes('/certificates/') ||
      lowercaseUrl.includes('bunnycdn.com') ||
      lowercaseUrl.includes('b-cdn.net') ||
      lowercaseUrl.includes('cloudinary.com') ||
      lowercaseUrl.includes('imgur.com') ||
      lowercaseUrl.includes('/image/') ||
      lowercaseUrl.includes('/photo/');
  };

  return (
    <ProfileSection
      icon={<Award className="w-5 h-5" />}
      title="Licenses & Certifications"
      count={certificates.length}
      action={isOwner ? (
        <>
          {onAddCertificate && <SectionAddButton onClick={onAddCertificate} label="Add Certificate" />}
          {onEditCertificate && certificates.length > 0 && (
            <SectionEditButton
              onClick={() => {
                if (certificates.length === 1) onEditCertificate(certificates[0]);
                else setEditing((current) => !current);
              }}
              label="Edit Certifications"
              active={editing}
            />
          )}
        </>
      ) : undefined}
    >
      {certificates.length === 0 ? (
        <SectionEmptyState
          icon={<Award className="w-5 h-5" />}
          message="No certifications added yet."
          actionLabel={isOwner && onAddCertificate ? 'Add Your First Certification' : undefined}
          onAction={isOwner && onAddCertificate ? onAddCertificate : undefined}
        />
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {certificates.map((cert, index) => (
            <RevealItem key={cert.id} index={index} className="group py-5 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3 sm:gap-4">
                  <ProfileEntryLogo
                    logo={cert.credentialUrl && isImageUrl(cert.credentialUrl) ? cert.credentialUrl : null}
                    label={cert.issuingOrg}
                    fallback={<Building className="h-5 w-5 text-neutral-400" />}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="min-w-0">
                    <h4 className="break-words text-[15px] font-semibold text-neutral-900 dark:text-white">
                      {cert.name}
                    </h4>
                    <p className="mt-1 break-words text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {cert.issuingOrg}
                    </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        {cert.credentialUrl && (
                          <button
                            onClick={() => setSelectedCertificate(cert)}
                            className="p-2 text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-white"
                            title="View certificate"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isOwner && onEditCertificate && editing && (
                          <button
                            onClick={() => onEditCertificate(cert)}
                            className="p-2 text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-white"
                            title="Edit certificate"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(cert.issueDate)}
                      </div>
                      {isExpired(cert) ? (
                        <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-neutral-700">Expired</span>
                      ) : cert.doesNotExpire ? (
                        <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-neutral-700">No Expiration</span>
                      ) : cert.expiryDate && (
                        <span>Expires {formatDate(cert.expiryDate)}</span>
                      )}
                    </div>
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
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                        <Award className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
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
