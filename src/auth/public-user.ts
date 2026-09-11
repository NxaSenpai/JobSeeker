import { User } from '../users/entities/user.entity';

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    lastName: user.lastName,
    companyName: user.companyName,
    contactName: user.contactName,
    headline: user.headline ?? null,
    location: user.location ?? null,
    bio: user.bio ?? null,
  };
}
