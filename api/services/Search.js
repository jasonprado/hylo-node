import forUsers from './Search/forUsers'
import forPosts from './Search/forPosts'
import { countTotal } from '../../lib/util/knex'
import addTermToQueryBuilder from './Search/addTermToQueryBuilder'
import { transform } from 'lodash'
import { flatten, flow, uniq, get } from 'lodash/fp'

module.exports = {
  forPosts,
  forUsers,

  forCommunities: function (opts) {
    return Community.query(qb => {
      if (opts.communities) {
        qb.whereIn('communities.id', opts.communities)
      }

      if (opts.autocomplete) {
        qb.whereRaw('communities.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.term) {
        addTermToQueryBuilder(opts.term, qb, {
          columns: ['communities.name']
        })
      }

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      countTotal(qb, 'communities', opts.totalColumnName)

      qb.limit(opts.limit)
      qb.offset(opts.offset)
      qb.groupBy('communities.id')
      qb.orderBy('communities.name', 'asc')
    })
  },

  forTags: function (opts) {
    return Tag.query(q => {
      if (opts.communities) {
        q.join('communities_tags', 'communities_tags.tag_id', '=', 'tags.id')
        q.whereIn('communities_tags.community_id', opts.communities)
      }
      if (opts.name) {
        q.where('tags.name', opts.name)
      }
      if (opts.autocomplete) {
        q.whereRaw('tags.name ilike ?', opts.autocomplete + '%')
      }

      countTotal(q, 'tags', opts.totalColumnName)

      q.groupBy('tags.id')
      q.limit(opts.limit)
    })
  },

  fullTextSearch: function (userId, args) {
    var items, total
    args.limit = args.first
    return fetchAllCommunityIds(userId)
    .then(communityIds =>
      FullTextSearch.searchInCommunities(communityIds, args))
      .then(items_ => {
        items = items_
        total = get('0.total', items)

        var ids = transform(items, (ids, item) => {
          var type = item.post_id ? 'posts'
            : item.comment_id ? 'comments' : 'people'

          if (!ids[type]) ids[type] = []
          var id = item.post_id || item.comment_id || item.user_id
          ids[type].push(id)
        }, {})

        return Promise.join(
          ids.posts && Post.where('id', 'in', ids.posts).fetchAll({
            withRelated: PostPresenter.relations(userId)
          }),

          ids.comments && Comment.where('id', 'in', ids.comments).fetchAll({
            withRelated: [
              {'user': userColumns},
              {'post': q => q.column('id', 'type', 'name', 'user_id')},
              {'post.user': userColumns},
              {'post.relatedUsers': userColumns},
              {'thanks.thankedBy': userColumns}
            ]
          }),

          ids.people && User.where('id', 'in', ids.people).fetchAll({
            withRelated: 'tags'
          }),

          (posts, comments, people) =>
            items.map(presentResult(posts, comments, people))
        )
      })
      .then(models => ({models, total}))
  }
}

const fetchAllCommunityIds = userId =>
  Promise.join(
    Network.activeCommunityIds(userId),
    Membership.activeCommunityIds(userId)
  ).then(flow(flatten, uniq))

const presentResult = (posts, comments, people) => item => {
  if (item.user_id) {
    return {
      id: `Person-${item.user_id}`,
      content: people.find(p => p.id === item.user_id)
    }
  } else if (item.post_id) {
    return {
      id: `Post-${item.post_id}`,
      content: posts.find(p => p.id === item.post_id)
    }
  } else if (item.comment_id) {
    return {
      id: `Comment-${item.comment_id}`,
      content: comments.find(c => c.id === item.comment_id)
    }
  }
  return null
}

const userColumns = q => q.column('id', 'name', 'avatar_url')
