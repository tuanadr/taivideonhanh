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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
class Admin extends sequelize_1.Model {
    // Helper methods
    validatePassword(password) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield bcryptjs_1.default.compare(password, this.password_hash);
        });
    }
    updateLastLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            this.last_login = new Date();
            yield this.save();
        });
    }
    hasPermission(permission) {
        return this.permissions.includes(permission) || this.role === 'super_admin';
    }
    isSuperAdmin() {
        return this.role === 'super_admin';
    }
    isAdmin() {
        return this.role === 'admin' || this.role === 'super_admin';
    }
    isModerator() {
        return this.role === 'moderator' || this.isAdmin();
    }
    toJSON() {
        const values = Object.assign({}, this.get());
        delete values.password_hash;
        return values;
    }
}
Admin.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password_hash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('super_admin', 'admin', 'moderator'),
        allowNull: false,
        defaultValue: 'moderator',
    },
    permissions: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    last_login: {
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
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: (admin) => __awaiter(void 0, void 0, void 0, function* () {
            if (admin.password_hash) {
                admin.password_hash = yield bcryptjs_1.default.hash(admin.password_hash, 12);
            }
        }),
        beforeUpdate: (admin) => __awaiter(void 0, void 0, void 0, function* () {
            if (admin.changed('password_hash')) {
                admin.password_hash = yield bcryptjs_1.default.hash(admin.password_hash, 12);
            }
        }),
    },
});
exports.default = Admin;
