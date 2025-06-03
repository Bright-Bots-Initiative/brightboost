const requireAuth = (context, req, allowedRoles = ['authenticated']) => {
  try {
    const header = req.headers['x-ms-client-principal'];
    if (!header) {
      throw new Error('Unauthorized');
    }

    const encoded = Buffer.from(header, 'base64');
    const decoded = encoded.toString('ascii');
    const clientPrincipal = JSON.parse(decoded);

    if (!clientPrincipal || !clientPrincipal.userRoles) {
      throw new Error('Unauthorized');
    }

    const hasAllowedRole = allowedRoles.some(role => 
      clientPrincipal.userRoles.map(r => r.toLowerCase()).includes(role.toLowerCase())
    );

    if (!hasAllowedRole) {
      throw new Error(`Forbidden - Required roles: ${allowedRoles.join(', ')}`);
    }

    context.log(`JWT valid for userId=${clientPrincipal.userId} role=${clientPrincipal.userRoles.includes('teacher') ? 'teacher' : 'student'}`);
    
    return {
      isAuthorized: true,
      user: {
        id: clientPrincipal.userId,
        email: clientPrincipal.userDetails,
        roles: clientPrincipal.userRoles,
        provider: clientPrincipal.identityProvider
      }
    };
  } catch (error) {
    context.log.error('Authentication error:', error.message);
    return {
      isAuthorized: false,
      error: error.message
    };
  }
};

module.exports = { requireAuth };
