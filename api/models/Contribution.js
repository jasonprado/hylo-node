module.exports = bookshelf.Model.extend({
  tableName: 'contributions',

  post: function () {
    return this.belongsTo(Post, 'post_id')
  },

  user: function () {
    return this.belongsTo(User, 'user_id').query({where: {active: true}})
  }

}, {
  create: (user_id, post_id, transacting) =>
    new Contribution({post_id, user_id, date_contributed: new Date()})
    .save(null, {transacting}),

  queryForUser: function (userId, communityIds) {
    return Contribution.query(q => {
      q.orderBy('date_contributed')
      q.join('posts', 'posts.id', '=', 'contributions.post_id')

      q.where({'contributions.user_id': userId, 'posts.active': true})

      if (communityIds) {
        q.join('post_community', 'post_community.post_id', '=', 'posts.id')
        q.join('communities', 'communities.id', '=', 'post_community.community_id')
        q.whereIn('communities.id', communityIds)
      }
    })
  },

  countForUser: function (user) {
    return this.query().count()
    .where({
      'contributions.user_id': user.id,
      'posts.active': true
    })
    .join('posts', function () {
      this.on('posts.id', '=', 'contributions.post_id')
    })
    .then(function (rows) {
      return rows[0].count
    })
  }

})
