import db from '../../models';
import CommentHelper from '../../helpers/CommentHelper';
import UserHelper from '../../helpers/UserHelper';
import ArticleHelper from '../../helpers/ArticleHelper';
import logger from '../../helpers/logger';
import HttpError from '../../helpers/exceptionHandler/httpError';
import eventBus from '../../helpers/eventBus';
import Util from '../../helpers/Util';

const { Comment, User } = db;

/**
 * Crud controller for Comment entity
 */
export default class CommentController {
  /**
   *
   * Method for creating Authors Comment
   * Authentication Required
   * @param {request} req
   * @param {response} res
   * @param {next} next
   * @return {object} return create article for user.
   */
  static async getComments(req, res, next) {
    try {
      const { slug } = req;
      const article = await ArticleHelper.findArticleBySlug(slug, []);
      HttpError.throwErrorIfNull(article, 'Article not found');
      const where = { $and: [{ articleId: article.id }, { parentId: null }] };
      const total = await Comment.count({
        where
      });
      const pageInfo = Util.getPageInfo(req.query.page, req.query.size, total);
      const {
        page, limit, offset, totalPages
      } = pageInfo;

      let comments = await Comment.findAll({
        limit,
        offset,
        where,
        include: [{
          model: User,
          as: 'user'
        }]
      });

      comments = CommentHelper.getCommentsResponseData(comments);
      return res.status(200)
        .json({
          data: {
            comments,
            page,
            totalPages,
            size: comments.length,
            total,
          },
          status: 'success',
          message: 'Successfully fetch articles.'
        });
    } catch (e) {
      next(e);
    }
  }

  /**
   *
   * Method for creating Authors Comment
   * Authentication Required
   * @param {request} req
   * @param {response} res
   * @param {next} next
   * @return {object} return create article for user.
   */
  static async getSubComments(req, res, next) {
    try {
      const { slug } = req;
      const { id } = req.params;
      const article = await ArticleHelper.findArticleBySlug(slug, []);
      HttpError.throwErrorIfNull(article, 'Article not found');
      const where = { $and: [{ articleId: article.id }, { parentId: id }] };
      const total = await Comment.count({
        where
      });
      const pageInfo = Util.getPageInfo(req.query.page, req.query.size, total);
      const {
        page, limit, offset, totalPages
      } = pageInfo;
      const includeUser = {
        model: User,
        as: 'user'
      };
      const include = [
        includeUser,
        {
          limit,
          offset,
          model: Comment,
          as: 'comments',
          include: [{ ...includeUser }]
        }];
      let comment = await CommentHelper.findCommentBy(id, include);
      const { user } = comment;
      const comments = CommentHelper.getCommentsResponseData(comment.comments);
      comment = CommentHelper.getCommentResponseData(user, comment.dataValues);
      return res.status(200)
        .json({
          comment: {
            ...comment,
            comments: {
              data: comments,
              page,
              totalPages,
              size: comments.length,
              total,

            },
          },
          status: 'success',
          message: 'Successfully fetch articles.'
        });
    } catch (e) {
      logger.error(e);
      next(e);
    }
  }

  /**
   *
   * Method for creating Authors Comment
   * Authentication Required
   * @param {request} req
   * @param {response} res
   * @param {next} next
   * @return {object} return create article for user.
   */
  static async createComment(req, res, next) {
    const { slug } = req;
    const { body } = req.body;
    const { id } = req.params;
    const { userId } = req.authData;
    try {
      const article = await ArticleHelper.findArticleBySlug(slug);
      HttpError.throwErrorIfNull(article, 'Article not found');
      let parent = null;
      if (id && !Number.isNaN(Number(id))) {
        parent = await Comment.findOne({
          where: { id }
        });
        // Throws an error if parent comment does not exist.
        HttpError.throwErrorIfNull(parent, 'comment not found');
      }
      if (parent && parent.parentId) {
        return res.status(403)
          .json({
            message: 'comment cannot go pass levels',
            status: 'error'
          });
      }

      const [user, createdComment] = await Promise.all([UserHelper.findById(userId),
        Comment.create({ body })
      ]);

      await Promise.all([
        createdComment.setParent(parent),
        createdComment.setUser(user),
        createdComment.setArticle(article)
      ]);

      const comment = CommentHelper.getCommentResponseData(user.dataValues,
        createdComment.dataValues);

      eventBus.emit('onArticleInteraction', {
        toUser: article.dataValues.userId,
        fromUser: createdComment.dataValues.userId,
        articleId: article.dataValues.id,
        type: 'comment'
      });

      return res.status(201)
        .json({
          comment,
          status: 'success',
          message: 'successfully created comment'
        });
    } catch (e) {
      next(e);
    }
  }

  /**
   *
   * Method for deleting Authors Comment
   * Authentication Required
   * @param {request} req
   * @param {response} res
   * @param {next} next
   * @return {object} return delete status.
   */
  static async deleteComment(req, res, next) {
    try {
      const { id } = req.params;
      const { slug } = req;
      const { userId } = req.authData;
      const article = await ArticleHelper.findArticleBySlug(slug, []);
      HttpError.throwErrorIfNull(article, 'Article not found');
      const comment = await CommentHelper.findCommentBy(id);
      if (comment.dataValues.userId === userId) {
        await CommentHelper.deleteComments(comment);
        return res.status(200)
          .json({
            message: 'deleted article successfully',
            status: 'success',
          });
      }
      return res.status(403)
        .json({
          message: 'You cannot perform this operation',
          status: 'error',
        });
    } catch (e) {
      logger.error(e);
      next(e);
    }
  }
}
