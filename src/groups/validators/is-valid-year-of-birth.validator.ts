import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export interface YearOfBirthOptions {
  minAge: number;
  maxAge: number;
}

@ValidatorConstraint({ async: false })
export class IsValidYearOfBirthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'number') return false;

    const { minAge, maxAge } = args.constraints[0] as YearOfBirthOptions;
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - maxAge;
    const maxYear = currentYear - minAge;

    return value >= minYear && value <= maxYear;
  }

  defaultMessage(args: ValidationArguments): string {
    const { minAge, maxAge } = args.constraints[0] as YearOfBirthOptions;
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - maxAge;
    const maxYear = currentYear - minAge;

    return `Year of birth must be between ${minYear} and ${maxYear}`;
  }
}

export function IsValidYearOfBirth(
  options: YearOfBirthOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsValidYearOfBirthConstraint,
    });
  };
}
