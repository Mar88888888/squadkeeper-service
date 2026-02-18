import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  getContacts(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.getContacts(user.id, user.role as UserRole);
  }
}
