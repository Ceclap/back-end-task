import {SequelizeClient} from '../sequelize';
import {raw, RequestHandler, Router} from 'express';
import {initAdminValidationRequestHandler, initTokenValidationRequestHandler, RequestAuth} from '../middleware';
import {UserType} from '../constants';
import {Op} from 'sequelize';
import {Post} from '../repositories/posts';
import {UnauthorizedError} from '../errors';

export function initPostsRouter(sequelizeClient: SequelizeClient): Router {
    const router = Router({ mergeParams: true });

    const tokenValidation = initTokenValidationRequestHandler(sequelizeClient);
    // const adminValidation = initAdminValidationRequestHandler();

    router.route('/')
        .get(tokenValidation, initListPostsRequestHandler(sequelizeClient))
        .post(tokenValidation, initCreatePostRequestHandler(sequelizeClient))
        .patch(tokenValidation, initUpdatePostRequestHandler(sequelizeClient))
        .delete(tokenValidation, initDeletePostRequestHandler(sequelizeClient));


    return router;
}

function initListPostsRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function listPostsRequestHandler(req, res, next): Promise<void> {
        const {models} = sequelizeClient;

        try {
            const {auth: {user: {type: userType, id: id}}} = req as unknown as { auth: RequestAuth };

            const isAdmin = userType === UserType.ADMIN;


            const posts = await models.posts.findAll({
                attributes: isAdmin ? ['id', 'title', 'content', 'authorId','isHidden', 'createdAt'] : ['title', 'authorId', 'content', 'isHidden', 'createdAt'],
                raw: true,
            });

            const filteredPosts = posts.filter((post) => {
                return !post.isHidden || post.authorId == id;
            });

            res.send(filteredPosts);

            return res.end();
        } catch (error) {
            next(error);
        }
    };
}

function initCreatePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function createPostRequestHandler(req, res, next): Promise<void> {

        const {auth} = req as unknown as { auth: RequestAuth };
        const {title, content} = req.body as Omit<CreatePostData, 'type'>;


        try {
            const { id } = await createPost({authorId:auth.user.id, title, content}, sequelizeClient);

            return res.status(200).send({id: id}).end();
        } catch (error) {
            next(error);
        }
    };
}

function initUpdatePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function updatePostRequestHandler(req, res, next): Promise<void> {
        const {models} = sequelizeClient;
        const {id, title, content, isHidden} = req.body as UpdatePostData;
        const {auth} = req as unknown as { auth: RequestAuth };

        try {
            const post = await models.posts.findOne({
                attributes: ['authorId', 'isHidden'],
                where: {id},
                raw: true,
            });

            if(!post)
            {
                throw new UnauthorizedError('POST_NOT_FOUND');
            }

            if (post.authorId !== auth.user.id) {
                throw new UnauthorizedError('AUTH_TOKEN_INVALID');
            }

            await models.posts.update(
                {
                    title,
                    content,
                    isHidden,
                },
                {
                    where: {
                        id,
                    },
                },
            );

            return res.status(204).end();
        } catch (error) {
            next(error);
        }
    };
}

function initDeletePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function deletePostRequestHandler(req, res, next): Promise<void> {
        const {models} = sequelizeClient;
        const {auth} = req as unknown as { auth: RequestAuth };
        const {id} = req.body as { id: number};
        const post = await models.posts.findOne({
            attributes: ['authorId'],
            where: {id},
            raw: true,
        });

        if(!post)
        {
            throw new UnauthorizedError('POST_NOT_FOUND');
        }
        if (post.authorId !== auth.user.id) {
            throw new UnauthorizedError('AUTH_TOKEN_INVALID');
        }
        await models.posts.destroy({
            where: {id},
        });
        res.status(204).end();
    };
}


        async function createPost({authorId, title, content}: CreatePostData, sequelizeClient: SequelizeClient): Promise<Post> {
    const {models} = sequelizeClient;

    return await models.posts.create({
        authorId,
        title,
        content,
    });
}

type CreatePostData = Pick<Post,'authorId' | 'title' | 'content'>;
type UpdatePostData = Pick<Post,'id' | 'authorId' | 'title' | 'content' | 'isHidden'>;