"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DMCAReport = exports.LegalDocument = exports.Admin = exports.Payment = exports.UserSubscription = exports.SubscriptionPlan = exports.StreamToken = exports.RefreshToken = exports.User = void 0;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const RefreshToken_1 = __importDefault(require("./RefreshToken"));
exports.RefreshToken = RefreshToken_1.default;
const StreamToken_1 = __importDefault(require("./StreamToken"));
exports.StreamToken = StreamToken_1.default;
const SubscriptionPlan_1 = __importDefault(require("./SubscriptionPlan"));
exports.SubscriptionPlan = SubscriptionPlan_1.default;
const UserSubscription_1 = __importDefault(require("./UserSubscription"));
exports.UserSubscription = UserSubscription_1.default;
const Payment_1 = __importDefault(require("./Payment"));
exports.Payment = Payment_1.default;
const Admin_1 = __importDefault(require("./Admin"));
exports.Admin = Admin_1.default;
const LegalDocument_1 = __importDefault(require("./LegalDocument"));
exports.LegalDocument = LegalDocument_1.default;
const DMCAReport_1 = __importDefault(require("./DMCAReport"));
exports.DMCAReport = DMCAReport_1.default;
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
// Subscription associations
User_1.default.hasMany(UserSubscription_1.default, {
    foreignKey: 'user_id',
    as: 'subscriptions',
    onDelete: 'CASCADE',
});
UserSubscription_1.default.belongsTo(User_1.default, {
    foreignKey: 'user_id',
    as: 'user',
});
UserSubscription_1.default.belongsTo(SubscriptionPlan_1.default, {
    foreignKey: 'plan_id',
    as: 'plan',
});
SubscriptionPlan_1.default.hasMany(UserSubscription_1.default, {
    foreignKey: 'plan_id',
    as: 'subscriptions',
});
// Payment associations
User_1.default.hasMany(Payment_1.default, {
    foreignKey: 'user_id',
    as: 'payments',
    onDelete: 'CASCADE',
});
Payment_1.default.belongsTo(User_1.default, {
    foreignKey: 'user_id',
    as: 'user',
});
Payment_1.default.belongsTo(UserSubscription_1.default, {
    foreignKey: 'subscription_id',
    as: 'subscription',
});
UserSubscription_1.default.hasMany(Payment_1.default, {
    foreignKey: 'subscription_id',
    as: 'payments',
});
// DMCA Report associations
DMCAReport_1.default.belongsTo(Admin_1.default, {
    foreignKey: 'processed_by',
    as: 'processedByAdmin',
});
Admin_1.default.hasMany(DMCAReport_1.default, {
    foreignKey: 'processed_by',
    as: 'processedReports',
});
exports.default = {
    User: User_1.default,
    RefreshToken: RefreshToken_1.default,
    StreamToken: StreamToken_1.default,
    SubscriptionPlan: SubscriptionPlan_1.default,
    UserSubscription: UserSubscription_1.default,
    Payment: Payment_1.default,
    Admin: Admin_1.default,
    LegalDocument: LegalDocument_1.default,
    DMCAReport: DMCAReport_1.default,
};
