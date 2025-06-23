"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamToken = exports.RefreshToken = exports.User = void 0;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const RefreshToken_1 = __importDefault(require("./RefreshToken"));
exports.RefreshToken = RefreshToken_1.default;
const StreamToken_1 = __importDefault(require("./StreamToken"));
exports.StreamToken = StreamToken_1.default;
// Define associations
User_1.default.hasMany(RefreshToken_1.default, {
    foreignKey: 'user_id',
    as: 'refreshTokens',
    onDelete: 'CASCADE',
});
RefreshToken_1.default.belongsTo(User_1.default, {
    foreignKey: 'user_id',
    as: 'user',
});
User_1.default.hasMany(StreamToken_1.default, {
    foreignKey: 'user_id',
    as: 'streamTokens',
    onDelete: 'CASCADE',
});
StreamToken_1.default.belongsTo(User_1.default, {
    foreignKey: 'user_id',
    as: 'user',
});
exports.default = {
    User: User_1.default,
    RefreshToken: RefreshToken_1.default,
    StreamToken: StreamToken_1.default,
};
