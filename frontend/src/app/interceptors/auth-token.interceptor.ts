import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const hasToken = req.headers.has('x-access-token');
  if (hasToken) {
    return next(req);
  }

  const token = localStorage.getItem('jwtOken') || '';
  const cloned = req.clone({ setHeaders: { 'x-access-token': token } });
  return next(cloned);
};
