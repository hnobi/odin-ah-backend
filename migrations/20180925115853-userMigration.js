module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('Users', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    username: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
    isVerified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    token: Sequelize.STRING,
    firstName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    bio: Sequelize.STRING,
    imageUrl: Sequelize.STRING,
    password: Sequelize.STRING,
    role: {
      type: Sequelize.ENUM(['user', 'admin', 'superadmin']),
      defaultValue: 'user'
    },
    createdAt: {
      type: Sequelize.DATE
    },
    updatedAt: {
      type: Sequelize.DATE
    },
    settings: {
      type: Sequelize.JSONB,
      defaultValue: {
        newFollower: true,
        newArticleFromUserFollowing: true,
        articleComment: true,
        articleLike: true,
        emailSubscribe: true,
        newFollowerOnSeries: true
      }
    }
  }),

  down: queryInterface => queryInterface.dropTable('Users')

};
