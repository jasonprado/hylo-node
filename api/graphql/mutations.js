import { isEmpty, merge, mapKeys, pick, transform, snakeCase } from 'lodash'
import {
  createComment as underlyingCreateComment,
  validateCommentCreateData
} from '../models/comment/createAndPresentComment'
import underlyingCreatePost, {
  validatePostCreateData
} from '../models/post/createPost'
import underlyingFindOrCreateThread, {
  validateThreadData
} from '../models/post/findOrCreateThread'

function convertGraphqlUserSettingsData (data) {
  return transform(data, (result, value, key) => {
    result[snakeCase(key)] = value
  }, {})
}

export function updateMe (userId, changes) {
  return User.find(userId)
  .then(user => user.validateAndSave(convertGraphqlUserSettingsData(changes)))
}

export function leaveCommunity (userId, communityId) {
  return User.find(userId)
  .then(user => user.leaveCommunity(communityId))
}

function convertGraphqlCreateData (data) {
  return Promise.resolve(merge({
    name: data.title,
    description: data.details,
    community_ids: data.communityIds,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    parent_post_id: data.parentPostId
  }, data))
}

export function createPost (userId, data) {
  return convertGraphqlCreateData(data)
  .tap(convertedData => validatePostCreateData(userId, convertedData))
  .then(convertedData => underlyingCreatePost(userId, convertedData))
}

export function createComment (userId, data) {
  return validateCommentCreateData(userId, data)
  .then(() => Promise.props({
    post: Post.find(data.postId),
    parentComment: data.parentCommentId ? Comment.find(data.parentCommentId) : null
  }))
  .then(extraData => underlyingCreateComment(userId, merge(data, extraData)))
}

export function createOrUpdatePersonConnection (userId, personId, type) {
  return UserConnection.createOrUpdate(userId, personId, type)
}

export function findOrCreateThread (userId, data) {
  return validateThreadData(userId, data)
  .then(() => underlyingFindOrCreateThread(userId, data.participantIds))
}

export function vote (userId, postId, isUpvote) {
  return Post.find(postId)
  .then(post => post.vote(userId, isUpvote))
}

export function subscribe (userId, topicId, communityId, isSubscribing) {
  return isSubscribing
    ? TagFollow.add(topicId, userId, communityId)
    : TagFollow.remove(topicId, userId, communityId)
}

export function updateMembership (userId, { id, data }) {
  const whitelist = mapKeys(pick(data, 'newPostCount'), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)

  return Membership.query().where({id, user_id: userId})
  .update(whitelist)
  .returning('id')
  .then(ids => ids[0])
}

export function updateTopicSubscription (userId, { id, data }) {
  const whitelist = mapKeys(pick(data, 'newPostCount'), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)

  return TagFollow.query().where({id, user_id: userId})
  .update(whitelist)
  .returning('id')
  .then(ids => ids[0])

export function markActivityRead (userId, activityid) {
  return Activity.find(activityid)
  .then(a => {
    if (a.get('reader_id') !== userId) return
    return a.save({unread: false})
  })
}

export function markAllActivitiesRead (userId) {
  return Activity.query().where('reader_id', userId).update({unread: false})
  .then(() => ({success: true}))
}
