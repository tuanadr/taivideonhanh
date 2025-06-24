"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class DMCAReport extends sequelize_1.Model {
    isPending() {
        return this.status === 'pending';
    }
    isValid() {
        return this.status === 'valid';
    }
    markAsProcessed(adminId, status, notes) {
        return __awaiter(this, void 0, void 0, function* () {
            this.status = status;
            this.processed_by = adminId;
            this.processed_at = new Date();
            if (notes) {
                this.admin_notes = notes;
            }
            yield this.save();
        });
    }
}
DMCAReport.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    reporter_name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    reporter_email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    reporter_address: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    copyright_owner: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    copyrighted_work_description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    infringing_url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true,
        },
    },
    infringing_content_description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    good_faith_statement: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
    },
    accuracy_statement: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
    },
    signature: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'under_review', 'valid', 'invalid', 'resolved'),
        allowNull: false,
        defaultValue: 'pending',
    },
    admin_notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    processed_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'admins',
            key: 'id',
        },
    },
    processed_at: {
        type: sequelize_1.DataTypes.DATE,
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
});
exports.default = DMCAReport;
