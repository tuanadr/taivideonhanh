import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CookieAttributes {
  id: string;
  filename: string;
  file_path: string;
  platform: string;
  description: string;
  cookie_count: number;
  domains: string[];
  uploaded_by: string;
  is_active: boolean;
  last_tested: Date | null;
  test_result: any;
  created_at: Date;
  updated_at: Date;
}

interface CookieCreationAttributes extends Optional<CookieAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Cookie extends Model<CookieAttributes, CookieCreationAttributes> implements CookieAttributes {
  public id!: string;
  public filename!: string;
  public file_path!: string;
  public platform!: string;
  public description!: string;
  public cookie_count!: number;
  public domains!: string[];
  public uploaded_by!: string;
  public is_active!: boolean;
  public last_tested!: Date | null;
  public test_result!: any;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations
  public static associate(models: any) {
    // Cookie belongs to Admin (uploaded_by)
    Cookie.belongsTo(models.Admin, {
      foreignKey: 'uploaded_by',
      as: 'uploader'
    });
  }
}

Cookie.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unknown',
      validate: {
        isIn: [['youtube', 'tiktok', 'facebook', 'instagram', 'twitter', 'unknown']],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cookie_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    domains: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id',
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    last_tested: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    test_result: {
      type: DataTypes.JSON,
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
    tableName: 'cookies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['platform'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['uploaded_by'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default Cookie;
