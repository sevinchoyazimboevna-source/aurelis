import { registerDecorator, ValidationOptions } from 'class-validator';
import { isJsonValue } from './json.type';
export function IsJsonValue(options?: ValidationOptions): PropertyDecorator {
	return (target, propertyName) =>
		registerDecorator({
			name: 'isJsonValue',
			target: target.constructor,
			propertyName: String(propertyName),
			options,
			validator: {
				validate: (value: unknown) => isJsonValue(value),
				defaultMessage: () => 'Value must be valid JSON',
			},
		});
}
