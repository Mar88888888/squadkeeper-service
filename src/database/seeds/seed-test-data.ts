import { DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { join } from 'path';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { Coach } from '../../coaches/entities/coach.entity';
import { Player } from '../../players/entities/player.entity';
import { Parent } from '../../parents/entities/parent.entity';
import { Group } from '../../groups/entities/group.entity';
import { Position } from '../../players/enums/position.enum';
import { StrongFoot } from '../../players/enums/strong-foot.enum';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { Training } from '../../events/entities/training.entity';

const coachesData = [
  { firstName: 'Олександр', lastName: 'Шовковський', email: 'shovkovskyi@academy.com', licenseLevel: 'UEFA Pro', experienceYears: 15, dateOfBirth: '1975-01-02' },
  { firstName: 'Андрій', lastName: 'Шевченко', email: 'shevchenko@academy.com', licenseLevel: 'UEFA Pro', experienceYears: 12, dateOfBirth: '1976-09-29' },
  { firstName: 'Сергій', lastName: 'Ребров', email: 'rebrov@academy.com', licenseLevel: 'UEFA A', experienceYears: 10, dateOfBirth: '1974-06-03' },
  { firstName: 'Олег', lastName: 'Лужний', email: 'luzhnyi@academy.com', licenseLevel: 'UEFA A', experienceYears: 8, dateOfBirth: '1968-08-05' },
  { firstName: 'Анатолій', lastName: 'Тимощук', email: 'tymoshchuk@academy.com', licenseLevel: 'UEFA B', experienceYears: 5, dateOfBirth: '1979-03-30' },
  { firstName: 'Руслан', lastName: 'Ротань', email: 'rotan@academy.com', licenseLevel: 'UEFA B', experienceYears: 4, dateOfBirth: '1981-10-29' },
];

const playersData = [
  // U-12 (2013) - 20 players
  { firstName: 'Максим', lastName: 'Коваленко', email: 'kovalenko.m@academy.com', dateOfBirth: '2013-03-15', position: Position.CM, groupYear: 2013, height: 145, weight: 38, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Артем', lastName: 'Бондаренко', email: 'bondarenko.a@academy.com', dateOfBirth: '2013-07-22', position: Position.ST, groupYear: 2013, height: 148, weight: 40, strongFoot: StrongFoot.LEFT },
  { firstName: 'Дмитро', lastName: 'Шевчук', email: 'shevchuk.d@academy.com', dateOfBirth: '2013-01-10', position: Position.CB, groupYear: 2013, height: 150, weight: 42, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Олексій', lastName: 'Мельник', email: 'melnyk.o@academy.com', dateOfBirth: '2013-11-05', position: Position.GK, groupYear: 2013, height: 152, weight: 44, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Богдан', lastName: 'Ткаченко', email: 'tkachenko.b@academy.com', dateOfBirth: '2013-05-18', position: Position.CAM, groupYear: 2013, height: 144, weight: 37, strongFoot: StrongFoot.BOTH },
  { firstName: 'Владислав', lastName: 'Петренко', email: 'petrenko.v@academy.com', dateOfBirth: '2013-09-30', position: Position.RB, groupYear: 2013, height: 149, weight: 41, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Тарас', lastName: 'Степаненко', email: 'stepanenko.t12@academy.com', dateOfBirth: '2013-02-08', position: Position.CDM, groupYear: 2013, height: 146, weight: 39, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Денис', lastName: 'Гармаш', email: 'garmash.d12@academy.com', dateOfBirth: '2013-04-19', position: Position.CM, groupYear: 2013, height: 147, weight: 40, strongFoot: StrongFoot.LEFT },
  { firstName: 'Віталій', lastName: 'Буяльський', email: 'buyalskyi.v12@academy.com', dateOfBirth: '2013-06-06', position: Position.CAM, groupYear: 2013, height: 143, weight: 36, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Микола', lastName: 'Шапаренко', email: 'shaparenko.m12@academy.com', dateOfBirth: '2013-08-14', position: Position.CM, groupYear: 2013, height: 148, weight: 41, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Георгій', lastName: 'Цитаішвілі', email: 'tsitaishvili.g12@academy.com', dateOfBirth: '2013-10-22', position: Position.LW, groupYear: 2013, height: 144, weight: 37, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Владислав', lastName: 'Ванат', email: 'vanat.v12@academy.com', dateOfBirth: '2013-12-03', position: Position.ST, groupYear: 2013, height: 150, weight: 42, strongFoot: StrongFoot.LEFT },
  { firstName: 'Ілля', lastName: 'Забарний', email: 'zabarnyi.i12@academy.com', dateOfBirth: '2013-01-25', position: Position.CB, groupYear: 2013, height: 153, weight: 45, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Валерій', lastName: 'Бондар', email: 'bondar.v12@academy.com', dateOfBirth: '2013-03-07', position: Position.CB, groupYear: 2013, height: 151, weight: 43, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Олександр', lastName: 'Караваєв', email: 'karavaev.o12@academy.com', dateOfBirth: '2013-05-02', position: Position.RB, groupYear: 2013, height: 147, weight: 39, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Віктор', lastName: 'Циганков', email: 'tsygankov.v12@academy.com', dateOfBirth: '2013-07-17', position: Position.RW, groupYear: 2013, height: 145, weight: 38, strongFoot: StrongFoot.LEFT },
  { firstName: 'Артем', lastName: 'Довбик', email: 'dovbyk.a12@academy.com', dateOfBirth: '2013-09-11', position: Position.ST, groupYear: 2013, height: 152, weight: 44, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Роман', lastName: 'Яремчук', email: 'yaremchuk.r12@academy.com', dateOfBirth: '2013-11-28', position: Position.ST, groupYear: 2013, height: 151, weight: 43, strongFoot: StrongFoot.LEFT },
  { firstName: 'Анатолій', lastName: 'Трубін', email: 'trubin.a12@academy.com', dateOfBirth: '2013-08-01', position: Position.GK, groupYear: 2013, height: 155, weight: 46, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Олексій', lastName: 'Гутцайт', email: 'guttsait.o12@academy.com', dateOfBirth: '2013-04-14', position: Position.LB, groupYear: 2013, height: 146, weight: 38, strongFoot: StrongFoot.LEFT },

  // U-14 (2011) - 20 players
  { firstName: 'Назар', lastName: 'Кравченко', email: 'kravchenko.n@academy.com', dateOfBirth: '2011-02-14', position: Position.ST, groupYear: 2011, height: 162, weight: 50, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Ілля', lastName: 'Савченко', email: 'savchenko.i@academy.com', dateOfBirth: '2011-06-08', position: Position.LW, groupYear: 2011, height: 158, weight: 48, strongFoot: StrongFoot.LEFT },
  { firstName: 'Данило', lastName: 'Литвиненко', email: 'lytvynenko.d@academy.com', dateOfBirth: '2011-12-25', position: Position.CB, groupYear: 2011, height: 165, weight: 52, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Тимур', lastName: 'Марченко', email: 'marchenko.t@academy.com', dateOfBirth: '2011-04-03', position: Position.CDM, groupYear: 2011, height: 160, weight: 49, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Кирило', lastName: 'Гончаренко', email: 'goncharenko.k@academy.com', dateOfBirth: '2011-08-19', position: Position.RW, groupYear: 2011, height: 163, weight: 51, strongFoot: StrongFoot.BOTH },
  { firstName: 'Ярослав', lastName: 'Павленко', email: 'pavlenko.y@academy.com', dateOfBirth: '2011-10-11', position: Position.GK, groupYear: 2011, height: 168, weight: 55, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Сергій', lastName: 'Сидорчук', email: 'sydorchuk.s14@academy.com', dateOfBirth: '2011-01-19', position: Position.CDM, groupYear: 2011, height: 164, weight: 53, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Володимир', lastName: 'Шепелєв', email: 'shepelev.v14@academy.com', dateOfBirth: '2011-03-25', position: Position.CM, groupYear: 2011, height: 159, weight: 47, strongFoot: StrongFoot.LEFT },
  { firstName: 'Микита', lastName: 'Бурда', email: 'burda.m14@academy.com', dateOfBirth: '2011-05-12', position: Position.CB, groupYear: 2011, height: 167, weight: 54, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Денис', lastName: 'Попов', email: 'popov.d14@academy.com', dateOfBirth: '2011-07-30', position: Position.CB, groupYear: 2011, height: 166, weight: 53, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Томаш', lastName: 'Кендзьора', email: 'kendzora.t14@academy.com', dateOfBirth: '2011-09-08', position: Position.RB, groupYear: 2011, height: 161, weight: 50, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Віталій', lastName: 'Миколенко', email: 'mykolenko.v14@academy.com', dateOfBirth: '2011-11-14', position: Position.LB, groupYear: 2011, height: 163, weight: 51, strongFoot: StrongFoot.LEFT },
  { firstName: 'Богдан', lastName: 'Михайліченко', email: 'mykhailichenko.b14@academy.com', dateOfBirth: '2011-02-28', position: Position.LB, groupYear: 2011, height: 160, weight: 48, strongFoot: StrongFoot.LEFT },
  { firstName: 'Олександр', lastName: 'Андрієвський', email: 'andrievskyi.o14@academy.com', dateOfBirth: '2011-04-17', position: Position.CM, groupYear: 2011, height: 158, weight: 46, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Назарій', lastName: 'Русин', email: 'rusyn.n14@academy.com', dateOfBirth: '2011-06-22', position: Position.CAM, groupYear: 2011, height: 157, weight: 45, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Артем', lastName: 'Беседін', email: 'besedin.a14@academy.com', dateOfBirth: '2011-08-31', position: Position.ST, groupYear: 2011, height: 169, weight: 56, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Євген', lastName: 'Коноплянка', email: 'konoplyanka.e14@academy.com', dateOfBirth: '2011-10-05', position: Position.LW, groupYear: 2011, height: 156, weight: 44, strongFoot: StrongFoot.LEFT },
  { firstName: 'Андрій', lastName: 'Ярмоленко', email: 'yarmolenko.a14@academy.com', dateOfBirth: '2011-12-20', position: Position.RW, groupYear: 2011, height: 165, weight: 52, strongFoot: StrongFoot.LEFT },
  { firstName: 'Георгій', lastName: 'Бущан', email: 'bushchan.g14@academy.com', dateOfBirth: '2011-05-28', position: Position.GK, groupYear: 2011, height: 170, weight: 57, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Руслан', lastName: 'Нещерет', email: 'neshcheret.r14@academy.com', dateOfBirth: '2011-03-11', position: Position.GK, groupYear: 2011, height: 172, weight: 58, strongFoot: StrongFoot.RIGHT },

  // U-16 (2009) - 20 players
  { firstName: 'Олег', lastName: 'Сидоренко', email: 'sydorenko.o@academy.com', dateOfBirth: '2009-01-28', position: Position.ST, groupYear: 2009, height: 175, weight: 65, strongFoot: StrongFoot.LEFT },
  { firstName: 'Андрій', lastName: 'Іваненко', email: 'ivanenko.a@academy.com', dateOfBirth: '2009-05-17', position: Position.CM, groupYear: 2009, height: 172, weight: 62, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Євген', lastName: 'Федоренко', email: 'fedorenko.e@academy.com', dateOfBirth: '2009-09-09', position: Position.CB, groupYear: 2009, height: 178, weight: 68, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Михайло', lastName: 'Кузьменко', email: 'kuzmenko.m@academy.com', dateOfBirth: '2009-03-21', position: Position.CAM, groupYear: 2009, height: 170, weight: 60, strongFoot: StrongFoot.BOTH },
  { firstName: 'Роман', lastName: 'Клименко', email: 'klymenko.r@academy.com', dateOfBirth: '2009-07-14', position: Position.LB, groupYear: 2009, height: 176, weight: 66, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Сергій', lastName: 'Яременко', email: 'yaremenko.s@academy.com', dateOfBirth: '2009-11-30', position: Position.GK, groupYear: 2009, height: 182, weight: 72, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Тарас', lastName: 'Качараба', email: 'kacharaba.t16@academy.com', dateOfBirth: '2009-02-15', position: Position.CB, groupYear: 2009, height: 180, weight: 70, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Максим', lastName: 'Малишев', email: 'malyshev.m16@academy.com', dateOfBirth: '2009-04-22', position: Position.CDM, groupYear: 2009, height: 174, weight: 64, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Олександр', lastName: 'Зубков', email: 'zubkov.o16@academy.com', dateOfBirth: '2009-06-08', position: Position.RW, groupYear: 2009, height: 171, weight: 61, strongFoot: StrongFoot.LEFT },
  { firstName: 'Маріян', lastName: 'Швед', email: 'shved.m16@academy.com', dateOfBirth: '2009-08-19', position: Position.LW, groupYear: 2009, height: 169, weight: 59, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Юхим', lastName: 'Конопля', email: 'konoplya.y16@academy.com', dateOfBirth: '2009-10-27', position: Position.RB, groupYear: 2009, height: 177, weight: 67, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Едуард', lastName: 'Соболь', email: 'sobol.e16@academy.com', dateOfBirth: '2009-12-14', position: Position.LB, groupYear: 2009, height: 175, weight: 65, strongFoot: StrongFoot.LEFT },
  { firstName: 'Віктор', lastName: 'Корнієнко', email: 'kornienko.v16@academy.com', dateOfBirth: '2009-01-05', position: Position.CM, groupYear: 2009, height: 168, weight: 58, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Ігор', lastName: 'Харатін', email: 'kharatin.i16@academy.com', dateOfBirth: '2009-03-18', position: Position.CM, groupYear: 2009, height: 173, weight: 63, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Богдан', lastName: 'Леднєв', email: 'lednev.b16@academy.com', dateOfBirth: '2009-05-29', position: Position.CM, groupYear: 2009, height: 170, weight: 60, strongFoot: StrongFoot.LEFT },
  { firstName: 'Микола', lastName: 'Матвієнко', email: 'matvienko.m16@academy.com', dateOfBirth: '2009-07-02', position: Position.CB, groupYear: 2009, height: 181, weight: 71, strongFoot: StrongFoot.LEFT },
  { firstName: 'Данило', lastName: 'Сікан', email: 'sikan.d16@academy.com', dateOfBirth: '2009-09-16', position: Position.ST, groupYear: 2009, height: 179, weight: 69, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Артем', lastName: 'Бондаренко', email: 'bondarenko.a16@academy.com', dateOfBirth: '2009-11-03', position: Position.ST, groupYear: 2009, height: 176, weight: 66, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Дмитро', lastName: 'Різник', email: 'riznyk.d16@academy.com', dateOfBirth: '2009-08-25', position: Position.GK, groupYear: 2009, height: 184, weight: 74, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Андрій', lastName: 'Пятов', email: 'pyatov.a16@academy.com', dateOfBirth: '2009-06-20', position: Position.GK, groupYear: 2009, height: 183, weight: 73, strongFoot: StrongFoot.RIGHT },

  // U-19 (2006) - 20 players
  { firstName: 'Олександр', lastName: 'Зінченко', email: 'zinchenko.o19@academy.com', dateOfBirth: '2006-01-15', position: Position.LB, groupYear: 2006, height: 178, weight: 68, strongFoot: StrongFoot.LEFT },
  { firstName: 'Микола', lastName: 'Мудрик', email: 'mudryk.m19@academy.com', dateOfBirth: '2006-03-22', position: Position.LW, groupYear: 2006, height: 175, weight: 65, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Георгій', lastName: 'Судаков', email: 'sudakov.g19@academy.com', dateOfBirth: '2006-05-09', position: Position.CAM, groupYear: 2006, height: 177, weight: 67, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Артем', lastName: 'Бондаренко', email: 'bondarenko.a19@academy.com', dateOfBirth: '2006-07-18', position: Position.ST, groupYear: 2006, height: 182, weight: 74, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Ілля', lastName: 'Забарний', email: 'zabarnyi.i19@academy.com', dateOfBirth: '2006-09-26', position: Position.CB, groupYear: 2006, height: 187, weight: 80, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Валерій', lastName: 'Бондар', email: 'bondar.v19@academy.com', dateOfBirth: '2006-11-04', position: Position.CB, groupYear: 2006, height: 185, weight: 78, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Анатолій', lastName: 'Трубін', email: 'trubin.a19@academy.com', dateOfBirth: '2006-02-08', position: Position.GK, groupYear: 2006, height: 192, weight: 85, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Віктор', lastName: 'Циганков', email: 'tsygankov.v19@academy.com', dateOfBirth: '2006-04-17', position: Position.RW, groupYear: 2006, height: 174, weight: 64, strongFoot: StrongFoot.LEFT },
  { firstName: 'Олексій', lastName: 'Сич', email: 'sych.o19@academy.com', dateOfBirth: '2006-06-25', position: Position.ST, groupYear: 2006, height: 180, weight: 72, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Володимир', lastName: 'Брагару', email: 'bragaru.v19@academy.com', dateOfBirth: '2006-08-14', position: Position.CM, groupYear: 2006, height: 176, weight: 66, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Назарій', lastName: 'Русин', email: 'rusyn.n19@academy.com', dateOfBirth: '2006-10-03', position: Position.LW, groupYear: 2006, height: 173, weight: 63, strongFoot: StrongFoot.LEFT },
  { firstName: 'Денис', lastName: 'Гречишкін', email: 'grechyshkin.d19@academy.com', dateOfBirth: '2006-12-19', position: Position.CDM, groupYear: 2006, height: 179, weight: 69, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Тарас', lastName: 'Степаненко', email: 'stepanenko.t19@academy.com', dateOfBirth: '2006-01-28', position: Position.CDM, groupYear: 2006, height: 181, weight: 71, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Сергій', lastName: 'Кривцов', email: 'kryvtsov.s19@academy.com', dateOfBirth: '2006-03-11', position: Position.CB, groupYear: 2006, height: 186, weight: 79, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Юрій', lastName: 'Корнієнко', email: 'kornienko.y19@academy.com', dateOfBirth: '2006-05-24', position: Position.LB, groupYear: 2006, height: 175, weight: 65, strongFoot: StrongFoot.LEFT },
  { firstName: 'Максим', lastName: 'Таловєров', email: 'taloverov.m19@academy.com', dateOfBirth: '2006-07-07', position: Position.CB, groupYear: 2006, height: 188, weight: 81, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Олександр', lastName: 'Караваєв', email: 'karavaev.o19@academy.com', dateOfBirth: '2006-09-15', position: Position.RB, groupYear: 2006, height: 177, weight: 67, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Артем', lastName: 'Довбик', email: 'dovbyk.a19@academy.com', dateOfBirth: '2006-11-22', position: Position.ST, groupYear: 2006, height: 189, weight: 83, strongFoot: StrongFoot.RIGHT },
  { firstName: 'Богдан', lastName: 'Михайліченко', email: 'mykhailichenko.b19@academy.com', dateOfBirth: '2006-02-19', position: Position.LB, groupYear: 2006, height: 176, weight: 66, strongFoot: StrongFoot.LEFT },
  { firstName: 'Руслан', lastName: 'Нещерет', email: 'neshcheret.r19@academy.com', dateOfBirth: '2006-04-30', position: Position.GK, groupYear: 2006, height: 190, weight: 82, strongFoot: StrongFoot.RIGHT },
];

const parentsData = [
  { firstName: 'Віктор', lastName: 'Коваленко', email: 'v.kovalenko@gmail.com', phone: '+380501234567', childLastNames: ['Коваленко'] },
  { firstName: 'Олена', lastName: 'Бондаренко', email: 'o.bondarenko@gmail.com', phone: '+380502345678', childLastNames: ['Бондаренко'] },
  { firstName: 'Петро', lastName: 'Шевчук', email: 'p.shevchuk@gmail.com', phone: '+380503456789', childLastNames: ['Шевчук'] },
  { firstName: 'Наталія', lastName: 'Мельник', email: 'n.melnyk@gmail.com', phone: '+380504567890', childLastNames: ['Мельник'] },
  { firstName: 'Ігор', lastName: 'Ткаченко', email: 'i.tkachenko@gmail.com', phone: '+380505678901', childLastNames: ['Ткаченко'] },
  { firstName: 'Марія', lastName: 'Петренко', email: 'm.petrenko@gmail.com', phone: '+380506789012', childLastNames: ['Петренко'] },
  { firstName: 'Василь', lastName: 'Кравченко', email: 'v.kravchenko@gmail.com', phone: '+380507890123', childLastNames: ['Кравченко'] },
  { firstName: 'Тетяна', lastName: 'Савченко', email: 't.savchenko@gmail.com', phone: '+380508901234', childLastNames: ['Савченко'] },
  { firstName: 'Олександр', lastName: 'Литвиненко', email: 'o.lytvynenko@gmail.com', phone: '+380509012345', childLastNames: ['Литвиненко'] },
  { firstName: 'Ірина', lastName: 'Марченко', email: 'i.marchenko@gmail.com', phone: '+380501122334', childLastNames: ['Марченко'] },
  { firstName: 'Дмитро', lastName: 'Гончаренко', email: 'd.goncharenko@gmail.com', phone: '+380502233445', childLastNames: ['Гончаренко'] },
  { firstName: 'Світлана', lastName: 'Павленко', email: 's.pavlenko@gmail.com', phone: '+380503344556', childLastNames: ['Павленко'] },
  { firstName: 'Микола', lastName: 'Сидоренко', email: 'm.sydorenko@gmail.com', phone: '+380504455667', childLastNames: ['Сидоренко'] },
  { firstName: 'Людмила', lastName: 'Іваненко', email: 'l.ivanenko@gmail.com', phone: '+380505566778', childLastNames: ['Іваненко'] },
  { firstName: 'Юрій', lastName: 'Федоренко', email: 'y.fedorenko@gmail.com', phone: '+380506677889', childLastNames: ['Федоренко'] },
];

const groupsData = [
  { name: 'U-12 Основна', yearOfBirth: 2013, headCoachIndex: 0, assistantIndices: [4] },
  { name: 'U-14 Основна', yearOfBirth: 2011, headCoachIndex: 1, assistantIndices: [5] },
  { name: 'U-16 Основна', yearOfBirth: 2009, headCoachIndex: 2, assistantIndices: [3] },
  { name: 'U-19', yearOfBirth: 2006, headCoachIndex: 2, assistantIndices: [3] },
];

async function seedTestData() {
  console.log('Starting test data seed...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'football_academy',
    entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established.');

    const userRepository = dataSource.getRepository(User);
    const coachRepository = dataSource.getRepository(Coach);
    const playerRepository = dataSource.getRepository(Player);
    const parentRepository = dataSource.getRepository(Parent);
    const groupRepository = dataSource.getRepository(Group);

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Coaches
    console.log('\nCreating coaches...');
    const createdCoaches: Coach[] = [];
    for (const coachData of coachesData) {
      const existingUser = await userRepository.findOne({ where: { email: coachData.email } });
      if (existingUser) {
        console.log(`  Coach ${coachData.email} already exists, skipping.`);
        const existingCoach = await coachRepository.findOne({ where: { user: { id: existingUser.id } } });
        if (existingCoach) createdCoaches.push(existingCoach);
        continue;
      }

      const user = userRepository.create({
        email: coachData.email,
        passwordHash: hashedPassword,
        role: UserRole.COACH,
        firstName: coachData.firstName,
        lastName: coachData.lastName,
      });
      await userRepository.save(user);

      const coach = coachRepository.create({
        firstName: coachData.firstName,
        lastName: coachData.lastName,
        dateOfBirth: new Date(coachData.dateOfBirth),
        licenseLevel: coachData.licenseLevel,
        experienceYears: coachData.experienceYears,
        user,
      });
      await coachRepository.save(coach);

      user.coach = coach;
      await userRepository.save(user);

      createdCoaches.push(coach);
      console.log(`  Created coach: ${coachData.firstName} ${coachData.lastName}`);
    }

    // Create Groups
    console.log('\nCreating groups...');
    const createdGroups: Group[] = [];
    for (const groupData of groupsData) {
      const existingGroup = await groupRepository.findOne({ where: { name: groupData.name } });
      if (existingGroup) {
        console.log(`  Group ${groupData.name} already exists, skipping.`);
        createdGroups.push(existingGroup);
        continue;
      }

      const group = groupRepository.create({
        name: groupData.name,
        yearOfBirth: groupData.yearOfBirth,
        headCoach: createdCoaches[groupData.headCoachIndex] || null,
        assistants: groupData.assistantIndices.map(i => createdCoaches[i]).filter(Boolean),
      });
      await groupRepository.save(group);
      createdGroups.push(group);
      console.log(`  Created group: ${groupData.name}`);
    }

    // Create Players
    console.log('\nCreating players...');
    const createdPlayers: Player[] = [];
    for (const playerData of playersData) {
      const existingUser = await userRepository.findOne({ where: { email: playerData.email } });
      if (existingUser) {
        console.log(`  Player ${playerData.email} already exists, skipping.`);
        const existingPlayer = await playerRepository.findOne({ where: { user: { id: existingUser.id } } });
        if (existingPlayer) createdPlayers.push(existingPlayer);
        continue;
      }

      const user = userRepository.create({
        email: playerData.email,
        passwordHash: hashedPassword,
        role: UserRole.PLAYER,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
      });
      await userRepository.save(user);

      const group = createdGroups.find(g => g.yearOfBirth === playerData.groupYear);

      const player = playerRepository.create({
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        dateOfBirth: new Date(playerData.dateOfBirth),
        position: playerData.position,
        height: playerData.height,
        weight: playerData.weight,
        strongFoot: playerData.strongFoot,
        user,
        ...(group ? { group } : {}),
      });
      await playerRepository.save(player);

      user.player = player;
      await userRepository.save(user);

      createdPlayers.push(player);
      console.log(`  Created player: ${playerData.firstName} ${playerData.lastName} (${playerData.position})`);
    }

    // Create Parents
    console.log('\nCreating parents...');
    for (const parentData of parentsData) {
      const existingUser = await userRepository.findOne({ where: { email: parentData.email } });
      if (existingUser) {
        console.log(`  Parent ${parentData.email} already exists, skipping.`);
        continue;
      }

      const user = userRepository.create({
        email: parentData.email,
        passwordHash: hashedPassword,
        role: UserRole.PARENT,
        firstName: parentData.firstName,
        lastName: parentData.lastName,
      });
      await userRepository.save(user);

      const parent = parentRepository.create({
        firstName: parentData.firstName,
        lastName: parentData.lastName,
        phoneNumber: parentData.phone,
        user,
      });
      await parentRepository.save(parent);

      user.parent = parent;
      await userRepository.save(user);

      // Link children
      const children = createdPlayers.filter(p =>
        parentData.childLastNames.includes(p.lastName)
      );

      if (children.length > 0) {
        for (const child of children) {
          child.parent = parent;
          await playerRepository.save(child);
        }
        console.log(`  Created parent: ${parentData.firstName} ${parentData.lastName} (children: ${children.map(c => c.firstName).join(', ')})`);
      } else {
        console.log(`  Created parent: ${parentData.firstName} ${parentData.lastName} (no children linked)`);
      }
    }

    // Create Evaluations for players
    console.log('\nCreating evaluations...');
    const evaluationRepository = dataSource.getRepository(Evaluation);
    const trainingRepository = dataSource.getRepository(Training);

    // Get all trainings grouped by group
    const trainings = await trainingRepository.find({
      relations: ['group'],
      where: { group: { id: In(createdGroups.map(g => g.id)) } },
      order: { startTime: 'ASC' },
    });

    // Get all players with their groups
    const allPlayers = await playerRepository.find({
      relations: ['group'],
      where: { group: { id: In(createdGroups.map(g => g.id)) } },
    });

    const evaluationComments = [
      'Відмінне тренування, показав прогрес у всіх аспектах',
      'Потрібно більше працювати над технікою',
      'Гарна командна робота',
      'Покращилась концентрація',
      'Активна участь, лідерські якості',
      'Стабільна гра, без помилок',
      'Потрібно покращити фізичну форму',
      'Відмінна тактична підготовка',
    ];

    let evaluationsCreated = 0;

    // Check if evaluations already exist
    const existingEvaluationsCount = await evaluationRepository.count();
    if (existingEvaluationsCount > 100) {
      console.log(`  ${existingEvaluationsCount} evaluations already exist, skipping.`);
    } else {
      // For each training, create evaluations for players in that group
      for (const training of trainings.slice(0, 30)) { // Limit to first 30 trainings
        const groupPlayers = allPlayers.filter(p => p.group?.id === training.group?.id);
        const coach = createdCoaches.find(c =>
          createdGroups.find(g => g.id === training.group?.id && g.headCoach?.id === c.id)
        ) || createdCoaches[0];

        // Create evaluations for 2-4 random players per training
        const playersToEvaluate = groupPlayers
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 3) + 2);

        for (const player of playersToEvaluate) {
          const comment = evaluationComments[Math.floor(Math.random() * evaluationComments.length)];

          // Generate random ratings (6-9) for each category
          const evaluation = evaluationRepository.create({
            technical: Math.floor(Math.random() * 4) + 6,
            tactical: Math.floor(Math.random() * 4) + 6,
            physical: Math.floor(Math.random() * 4) + 6,
            psychological: Math.floor(Math.random() * 4) + 6,
            comment,
            player,
            coach,
            training,
          });
          await evaluationRepository.save(evaluation);
          evaluationsCreated++;
        }
      }
      console.log(`  Created ${evaluationsCreated} evaluations`);
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\nSummary:');
    console.log(`  - Coaches: ${coachesData.length}`);
    console.log(`  - Groups: ${groupsData.length}`);
    console.log(`  - Players: ${playersData.length}`);
    console.log(`  - Parents: ${parentsData.length}`);
    console.log(`  - Evaluations: ${evaluationsCreated}`);
    console.log('\nAll users have password: password123');

  } catch (error) {
    console.error('Error during test data seed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\nDatabase connection closed.');
  }
}

seedTestData();
