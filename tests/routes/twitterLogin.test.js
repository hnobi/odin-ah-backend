import chai from 'chai';
import chaiHttp from 'chai-http';
import server from '../../index';
import { user } from '../../helpers/passportMockStrategy';

const { expect } = chai;
chai.use(chaiHttp);

describe('GET /auth/twitter', () => {
  it('should return a JWT when user successfully authenticates', (done) => {
    user.emails = [{ value: 'johndoe@gmail.com' }];
    chai
      .request(server)
      .get('/api/v1/auth/twitter/callback')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.user).to.have.property('token');
        expect(res.body.user.token).to.not.be.null;
        expect(res.body.user).to.have.property('imageUrl');
        expect(res.body.user).to.have.property('bio');
        expect(res.body.user)
          .to.have.property('email')
          .that.is.equal('johndoe@gmail.com');
        done();
      });
  });

  it('should return a 401 unauthorized error when the user signs up with an account that has no associated email', (done) => {
    user.emails = null;
    chai
      .request(server)
      .get('/api/v1/auth/twitter/callback')
      .end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body).to.have.property('errors');
        expect(res.body.errors).to.have.property('message');
        done();
      });
  });

  it('should return a 500 server error message when a database error occurs', (done) => {
    user.emails = [{ value: 'badEmail' }]; // simulating a database error with a bad email
    chai
      .request(server)
      .get('/api/v1/auth/twitter/callback')
      .end((err, res) => {
        expect(res.status).to.equal(500);
        done();
      });
  });
});