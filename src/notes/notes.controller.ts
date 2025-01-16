import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Put,
  Body,
  Req,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';

@Controller('notes')
@UseGuards(FirebaseAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll(@Req() req) {
    return this.notesService.findAll(req.user.userId);
  }

  @Get('favorites')
  findFavorites(@Req() req) {
    return this.notesService.findFavorites(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.notesService.findOne(id, req.user.userId);
  }

  @Put(':id/favorite')
  updateFavorite(
    @Param('id') id: string,
    @Body() updateFavoriteDto: UpdateFavoriteDto,
    @Req() req,
  ) {
    return this.notesService.updateFavorite(
      id,
      updateFavoriteDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.notesService.remove(id, req.user.userId);
  }
}
