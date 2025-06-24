import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DMCAReportAttributes {
  id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_address: string;
  copyright_owner: string;
  copyrighted_work_description: string;
  infringing_url: string;
  infringing_content_description: string;
  good_faith_statement: boolean;
  accuracy_statement: boolean;
  signature: string;
  status: 'pending' | 'under_review' | 'valid' | 'invalid' | 'resolved';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface DMCAReportCreationAttributes extends Optional<DMCAReportAttributes, 'id' | 'created_at' | 'updated_at' | 'status' | 'admin_notes' | 'processed_by' | 'processed_at'> {}

class DMCAReport extends Model<DMCAReportAttributes, DMCAReportCreationAttributes> implements DMCAReportAttributes {
  public id!: string;
  public reporter_name!: string;
  public reporter_email!: string;
  public reporter_address!: string;
  public copyright_owner!: string;
  public copyrighted_work_description!: string;
  public infringing_url!: string;
  public infringing_content_description!: string;
  public good_faith_statement!: boolean;
  public accuracy_statement!: boolean;
  public signature!: string;
  public status!: 'pending' | 'under_review' | 'valid' | 'invalid' | 'resolved';
  public admin_notes!: string | null;
  public processed_by!: string | null;
  public processed_at!: Date | null;
  public created_at!: Date;
  public updated_at!: Date;

  public isPending(): boolean {
    return this.status === 'pending';
  }

  public isValid(): boolean {
    return this.status === 'valid';
  }

  public async markAsProcessed(adminId: string, status: 'valid' | 'invalid', notes?: string): Promise<void> {
    this.status = status;
    this.processed_by = adminId;
    this.processed_at = new Date();
    if (notes) {
      this.admin_notes = notes;
    }
    await this.save();
  }
}

DMCAReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reporter_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reporter_email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    reporter_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    copyright_owner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    copyrighted_work_description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    infringing_url: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    infringing_content_description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    good_faith_statement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    accuracy_statement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'valid', 'invalid', 'resolved'),
      allowNull: false,
      defaultValue: 'pending',
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id',
      },
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'dmca_reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['reporter_email'],
      },
      {
        fields: ['processed_by'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default DMCAReport;
