var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var InvitationController = require(root('api/controllers/InvitationController'))
import { spyify, unspyify } from '../../setup/helpers'

describe('InvitationController', () => {
  var user, community, invitation, inviter, req, res

  before(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('.use', () => {
    before(() => {
      user = factories.user()
      inviter = factories.user()
      community = factories.community()
      return Promise.join(inviter.save(), user.save(), community.save())
      .then(() => {
        req.login(user.id)

        return Invitation.create({
          communityId: community.id,
          userId: inviter.id,
          email: 'foo@bar.com'
        }).tap(i => {
          invitation = i
          req.params.token = invitation.get('token')
        })
      })
    })

    it('adds the user to the community', () => {
      return InvitationController.use(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
        return user.load(['communities'])
      })
      .then(() => {
        expect(user.relations.communities.first().id).to.equal(community.id)
      })
    })
  })

  describe('.create', () => {
    var community, apiResult

    before(() => {
      community = factories.community()
      return community.save()
    })

    beforeEach(() => {
      req.session.userId = user.id
      spyify(Email, 'sendInvitation', function () {
        const apiPromise = Array.prototype.slice.call(arguments)[2]
        return apiPromise.then(result => apiResult = result)
      })
    })

    afterEach(() => unspyify(Email, 'sendInvitation'))

    it('rejects invalid email', () => {
      _.extend(req.params, {communityId: community.id, emails: 'wow, lol'})

      return InvitationController.create(req, res)
      .then(() => {
        expect(res.body).to.deep.equal({
          results: [
            {email: 'wow', error: 'not a valid email address'},
            {email: 'lol', error: 'not a valid email address'}
          ]
        })
      })
    })

    it('sends invitations', function () {
      this.timeout(10000)
      _.extend(req.params, {communityId: community.id, emails: 'foo@bar.com, bar@baz.com'})

      return InvitationController.create(req, res)
      .then(() => {
        expect(Email.sendInvitation).to.have.been.called.exactly(2)
        expect(apiResult).to.exist
        expect(apiResult.success).to.be.true

        expect(res.body).to.deep.equal({
          results: [
            {email: 'foo@bar.com', error: null},
            {email: 'bar@baz.com', error: null}
          ]
        })
      })
    })
  })
})
