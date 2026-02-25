import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

interface DateOfBirthOptions {
  minAge?: number;
  maxAge?: number;
}

@ValidatorConstraint({ async: false })
export class IsDateOfBirthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (!value) return true;
    if (typeof value !== 'string') return false;

    const date = new Date(value);
    if (isNaN(date.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Must be in the past
    if (date >= today) return false;

    const options = args.constraints[0] as DateOfBirthOptions;
    const age = this.calculateAge(date, today);

    if (options.minAge !== undefined && age < options.minAge) return false;
    if (options.maxAge !== undefined && age > options.maxAge) return false;

    return true;
  }

  private calculateAge(birthDate: Date, today: Date): number {
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  defaultMessage(args: ValidationArguments): string {
    const options = args.constraints[0] as DateOfBirthOptions;
    if (options.minAge !== undefined && options.maxAge !== undefined) {
      return `Age must be between ${options.minAge} and ${options.maxAge} years`;
    }
    if (options.minAge !== undefined) {
      return `Age must be at least ${options.minAge} years`;
    }
    if (options.maxAge !== undefined) {
      return `Age must not exceed ${options.maxAge} years`;
    }
    return 'Invalid date of birth';
  }
}

export function IsDateOfBirth(
  options: DateOfBirthOptions = {},
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsDateOfBirthConstraint,
    });
  };
}
