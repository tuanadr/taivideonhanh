import { LegalDocument, DMCAReport } from '../models';
import { Op } from 'sequelize';

export interface CreateDMCAReportData {
  reporterName: string;
  reporterEmail: string;
  reporterAddress: string;
  copyrightOwner: string;
  copyrightedWorkDescription: string;
  infringingUrl: string;
  infringingContentDescription: string;
  goodFaithStatement: boolean;
  accuracyStatement: boolean;
  signature: string;
}

class LegalService {
  /**
   * Get active legal document by type
   */
  async getLegalDocument(type: 'terms_of_service' | 'privacy_policy' | 'dmca_policy' | 'user_agreement'): Promise<LegalDocument | null> {
    return await LegalDocument.findOne({
      where: {
        type,
        is_active: true,
        effective_date: {
          [Op.lte]: new Date(),
        },
      },
      order: [['effective_date', 'DESC']],
    });
  }

  /**
   * Get all legal documents
   */
  async getAllLegalDocuments(): Promise<LegalDocument[]> {
    return await LegalDocument.findAll({
      where: {
        is_active: true,
        effective_date: {
          [Op.lte]: new Date(),
        },
      },
      order: [['type', 'ASC'], ['effective_date', 'DESC']],
    });
  }

  /**
   * Create or update legal document
   */
  async createOrUpdateLegalDocument(
    type: 'terms_of_service' | 'privacy_policy' | 'dmca_policy' | 'user_agreement',
    title: string,
    content: string,
    version: string,
    effectiveDate?: Date
  ): Promise<LegalDocument> {
    // Deactivate previous versions
    await LegalDocument.update(
      { is_active: false },
      {
        where: {
          type,
          is_active: true,
        },
      }
    );

    // Create new version
    const document = await LegalDocument.create({
      type,
      title,
      content,
      version,
      effective_date: effectiveDate || new Date(),
      is_active: true,
    });

    return document;
  }

  /**
   * Submit DMCA report
   */
  async submitDMCAReport(data: CreateDMCAReportData): Promise<DMCAReport> {
    const report = await DMCAReport.create({
      reporter_name: data.reporterName,
      reporter_email: data.reporterEmail,
      reporter_address: data.reporterAddress,
      copyright_owner: data.copyrightOwner,
      copyrighted_work_description: data.copyrightedWorkDescription,
      infringing_url: data.infringingUrl,
      infringing_content_description: data.infringingContentDescription,
      good_faith_statement: data.goodFaithStatement,
      accuracy_statement: data.accuracyStatement,
      signature: data.signature,
    });

    // TODO: Send notification email to admins
    console.log(`New DMCA report submitted: ${report.id}`);

    return report;
  }

  /**
   * Get DMCA reports with pagination
   */
  async getDMCAReports(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{
    reports: DMCAReport[];
    totalCount: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const offset = (page - 1) * limit;
    
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await DMCAReport.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      reports: rows,
      totalCount: count,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Process DMCA report
   */
  async processDMCAReport(
    reportId: string,
    adminId: string,
    status: 'valid' | 'invalid',
    notes?: string
  ): Promise<DMCAReport> {
    const report = await DMCAReport.findByPk(reportId);
    if (!report) {
      throw new Error('DMCA report not found');
    }

    await report.markAsProcessed(adminId, status, notes);

    // TODO: If valid, take action on the infringing content
    if (status === 'valid') {
      console.log(`DMCA report ${reportId} marked as valid. Taking action on: ${report.infringing_url}`);
      // Implement content removal logic here
    }

    return report;
  }

  /**
   * Initialize default legal documents
   */
  async initializeDefaultLegalDocuments(): Promise<void> {
    const existingDocs = await LegalDocument.count();
    if (existingDocs > 0) {
      return; // Documents already exist
    }

    const defaultDocuments = [
      {
        type: 'terms_of_service' as const,
        title: 'Terms of Service',
        content: `# Terms of Service

## 1. Acceptance of Terms
By using TaiVideoNhanh, you agree to these Terms of Service.

## 2. Service Description
TaiVideoNhanh is a video downloading service that allows users to download videos from supported platforms.

## 3. User Responsibilities
- You must only download content you have the right to download
- You are responsible for complying with copyright laws
- You must not use the service for illegal purposes

## 4. Prohibited Uses
- Downloading copyrighted content without permission
- Using the service to infringe on intellectual property rights
- Attempting to circumvent service limitations

## 5. Service Limitations
- Free users have limited downloads per day
- Service availability is not guaranteed
- We reserve the right to modify or discontinue the service

## 6. Privacy
Your privacy is important to us. Please review our Privacy Policy.

## 7. Disclaimer
The service is provided "as is" without warranties of any kind.

## 8. Contact
For questions about these terms, contact us at legal@taivideonhanh.com`,
        version: '1.0',
      },
      {
        type: 'privacy_policy' as const,
        title: 'Privacy Policy',
        content: `# Privacy Policy

## 1. Information We Collect
- Account information (email, password)
- Usage data (downloads, streaming activity)
- Technical data (IP address, browser information)

## 2. How We Use Information
- To provide and improve our service
- To communicate with you
- To ensure service security

## 3. Information Sharing
We do not sell or share your personal information with third parties except as required by law.

## 4. Data Security
We implement appropriate security measures to protect your information.

## 5. Your Rights
You have the right to access, update, or delete your personal information.

## 6. Contact
For privacy questions, contact us at privacy@taivideonhanh.com`,
        version: '1.0',
      },
      {
        type: 'dmca_policy' as const,
        title: 'DMCA Policy',
        content: `# DMCA Policy

## Digital Millennium Copyright Act Notice

TaiVideoNhanh respects the intellectual property rights of others and expects users to do the same.

## Filing a DMCA Notice

If you believe your copyrighted work has been infringed, please provide:

1. Your contact information
2. Description of the copyrighted work
3. Location of the infringing material
4. Statement of good faith belief
5. Statement of accuracy under penalty of perjury
6. Your electronic or physical signature

## Contact Information

Send DMCA notices to: dmca@taivideonhanh.com

## Counter-Notification

If you believe content was removed in error, you may file a counter-notification.

## Repeat Infringers

We will terminate accounts of repeat infringers.`,
        version: '1.0',
      },
    ];

    for (const doc of defaultDocuments) {
      await LegalDocument.create({
        ...doc,
        effective_date: new Date(),
        is_active: true,
      });
    }

    console.log('Default legal documents initialized');
  }
}

export default new LegalService();
