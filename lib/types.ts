export type NoneEmptyArray<T> = [T, ...T[]];

export type PositiveInteger<T extends number> = T extends 0
  ? never
  : `${T}` extends `${infer _WholePart}.${infer _DecimalPart}`
    ? never
    : `${T}` extends `-${infer _NegativeSign}`
      ? never
      : T;

export type FixedLengthArray<
  T,
  Length extends number,
  Accumulator extends NoneEmptyArray<T> = [T],
> = Length extends PositiveInteger<Length>
  ? number extends Length
    ? NoneEmptyArray<T>
    : Length extends Accumulator["length"]
      ? Accumulator
      : FixedLengthArray<T, Length, [T, ...Accumulator]>
  : never;
