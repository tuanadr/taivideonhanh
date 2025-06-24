import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface LegalDocumentAttributes {
  id: string;
  type: 'terms_of_service' | 'privacy_policy' | 'dmca_policy' | 'user_agreement';
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  effective_date: Date;
  created_at: Date;
  updated_at: Date;
}

interface LegalDocumentCreationAttributes extends Optional<LegalDocumentAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active'> {}

class LegalDocument extends Model<LegalDocumentAttributes, LegalDocumentCreationAttributes> implements LegalDocumentAttributes {
  public id!: string;
  public type!: 'terms_of_service' | 'privacy_policy' | 'dmca_policy' | 'user_agreement';
  public title!: string;
  public content!: string;
  public version!: string;
  public is_active!: boolean;
  public effective_date!: Date;
  public created_at!: Date;
  public updated_at!: Date;

  public isActive(): boolean {
    return this.is_active && this.effective_date <= new Date();
  }
}

LegalDocument.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('terms_of_service', 'privacy_policy', 'dmca_policy', 'user_agreement'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    effective_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    tableName: 'legal_documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['type'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['effective_date'],
      },
    ],
  }
);

export default LegalDocument;
