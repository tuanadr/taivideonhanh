import User from './User';
import RefreshToken from './RefreshToken';
import StreamToken from './StreamToken';

// Define associations
User.hasMany(RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens',
  onDelete: 'CASCADE',
});

RefreshToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(StreamToken, {
  foreignKey: 'user_id',
  as: 'streamTokens',
  onDelete: 'CASCADE',
});

StreamToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

export {
  User,
  RefreshToken,
  StreamToken,
};

export default {
  User,
  RefreshToken,
  StreamToken,
};
