"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cookie = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Cookie extends sequelize_1.Model {
    // Associations
    static associate(models) {
        // Cookie belongs to Admin (uploaded_by)
        Cookie.belongsTo(models.Admin, {
            foreignKey: 'uploaded_by',
            as: 'uploader'
        });
    }
}
exports.Cookie = Cookie;
Cookie.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    filename: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255],
        },
    },
    file_path: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    platform: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'unknown',
        validate: {
            isIn: [['youtube', 'tiktok', 'facebook', 'instagram', 'twitter', 'unknown']],
        },
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    cookie_count: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
        },
    },
    domains: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    uploaded_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'admins',
            key: 'id',
        },
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    last_tested: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    test_result: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: database_1.default,
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
});
exports.default = Cookie;
