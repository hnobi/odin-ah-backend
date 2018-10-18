import moment from 'moment';
import db from '../models';
import Mail from './Mail';
import logger from '../helpers/logger';
import Notification from '../controllers/user/Notification';

const { User, Article, Follows } = db;

/**
 *
 *
 * @class MailNotificationService
 */
class MailNotificationService {
  /**
     * Method to be triggered to send notification email when an article has a new comment
     * @param {object} eventInfo
     * @memberof MailNotificationService
     * @returns {null} Does not return
     * @param {next} next
     */
  static async onArticleInteraction(eventInfo) {
    try {
      const {
        toUser,
        fromUser,
        articleId,
        type
      } = eventInfo;
      const toUserInfoPromise = User.findOne({ where: { id: toUser } });
      const fromUserInfoPromise = User.findOne({ where: { id: fromUser } });
      const articleInfoPromise = Article.findOne({ where: { id: articleId } });
      const [toUserInfo, fromUserInfo, articleInfo] = await Promise.all([
        toUserInfoPromise,
        fromUserInfoPromise,
        articleInfoPromise
      ]);
      const { username } = fromUserInfo;
      const { email, settings } = toUserInfo;
      const { title, slug } = articleInfo;
      const info = {
        recipientEmail: email,
        fromUsername: username,
        articleTitle: title,
        articleSlug: slug
      };
      if (settings.emailSubscribe && type === 'comment') {
        await Mail.sendCommentNotification(info);
      }
      if (settings.emailSubscribe && type === 'like') {
        await Mail.sendCommentNotification(info);
      }

      if (settings.articleLike && type === 'like') {
        const notificationInfo = {
          userId: toUserInfo.id,
          message: `${username} liked your Article: ${title}. Date: ${moment().format('LLLL')} ago`,
          isRead: false,
          type: 'like'
        };
        await Notification.create(notificationInfo);
      }

      if (settings.articleComment && type === 'comment') {
        const notificationInfo = {
          userId: toUserInfo.id,
          message: `${username} commented on your Article: ${title}. Date:  ${moment().format('LLLL')} ago`,
          isRead: false,
          type: 'comment'
        };
        await Notification.create(notificationInfo);
      }
    } catch (error) {
      logger.error(error);
    }
  }

  /**
     * Method to be triggered to send notification email a user gets a new follower
     * @param {object} eventInfo
     * @memberof MailNotificationService
     * @returns {null} Does not return
     * @param {next} next
     */
  static async onFollowEvent(eventInfo) {
    try {
      const { toUser, fromUser } = eventInfo;
      const toUserInfoPromise = User.findOne({ where: { id: toUser } });
      const fromUserInfoPromise = User.findOne({ where: { id: fromUser } });
      const [toUserInfo, fromUserInfo] = await Promise.all([
        toUserInfoPromise,
        fromUserInfoPromise
      ]);
      const { username } = fromUserInfo;
      const { email, settings } = toUserInfo;
      const info = {
        recipientEmail: email,
        fromUsername: username
      };
      const notificationInfo = {
        userId: fromUserInfo.id,
        message: `${toUserInfo.username} started following you ${moment().format('LLLL')} ago`,
        type: 'follow',
        isRead: false
      };
      let res;
      if (settings.newFollower) {
        res = await Notification.create(notificationInfo);
      }
      if (settings.emailSubscribe) {
        res = Mail.newFollowNotification(info);
      }
      return res;
    } catch (error) {
      logger.error(error);
    }
  }

  /**
     * Method to be triggered to send a notification email
     * when a user I follow publish a new article
     * @param {object} eventInfo
     * @memberof MailNotificationService
     * @returns {null} Does not return
     * @param {next} next
     */
  static async onNewPostEvent(eventInfo) {
    try {
      const { authorId, articleId } = eventInfo;
      const authorInfoPromise = User.findOne({ where: { id: authorId } });
      const articleInfoPromise = Article.findOne({ where: { id: articleId } });
      const authorsFollowersPromise = Follows.findAll({ where: { following: authorId } });

      const [authorInfo, articleInfo, authorsFollowers] = await Promise.all([
        authorInfoPromise,
        articleInfoPromise,
        authorsFollowersPromise
      ]);

      const followersIdArray = authorsFollowers.map(user => user.follower);
      const users = await User.findAll({
        where: {
          id: followersIdArray,
          settings: {
            newArticleFromUserFollowing: 'true'
          }
        }
      });
      const recipientsEmail = users.map(user => user.email);
      const { username } = authorInfo;
      const { title, slug } = articleInfo;
      const info = {
        recipientsEmail,
        fromUsername: username,
        articleTitle: title,
        articleSlug: slug
      };
      users.forEach(async (user) => {
        const notificationInfo = {
          userId: user.id,
          message: `${username} created a new Airticle: ${title} ${moment().format('LLLL')} ago`,
          type: 'newAirticle',
          isRead: false,
        };
        await Notification.create(notificationInfo);
      });
      return Mail.followArticleNotification(info);
    } catch (error) {
      logger.error(error);
    }
  }
}


export default MailNotificationService;
